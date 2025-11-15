'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'

interface UserUuidContextType {
    uuid: string | null
    isLoading: boolean
    refresh: () => Promise<void>
    clearCache: () => void
}

const UserUuidContext = createContext<UserUuidContextType | null>(null)

// Cache global para UUID - persiste entre re-renders
const uuidCache = {
    value: null as string | null,
    timestamp: 0,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
    isValid: function () {
        return this.value && (Date.now() - this.timestamp) < this.CACHE_DURATION
    },
    set: function (value: string) {
        this.value = value
        this.timestamp = Date.now()
        // También guardar en sessionStorage como fallback
        try {
            sessionStorage.setItem('cached_uuid', value)
            sessionStorage.setItem('cached_uuid_timestamp', Date.now().toString())
        } catch { }
    },
    get: function () {
        // Verificar cache en memoria primero
        if (this.isValid()) {
            return this.value
        }

        // Fallback a sessionStorage
        try {
            const storedUuid = sessionStorage.getItem('cached_uuid')
            const storedTimestamp = sessionStorage.getItem('cached_uuid_timestamp')

            if (storedUuid && storedTimestamp) {
                const timestamp = parseInt(storedTimestamp)
                if ((Date.now() - timestamp) < this.CACHE_DURATION) {
                    this.value = storedUuid
                    this.timestamp = timestamp
                    return storedUuid
                }
            }
        } catch { }

        return null
    },
    clear: function () {
        this.value = null
        this.timestamp = 0
        try {
            sessionStorage.removeItem('cached_uuid')
            sessionStorage.removeItem('cached_uuid_timestamp')
        } catch { }
    }
}

export function UserUuidProvider({ children }: { children: React.ReactNode }) {
    const [uuid, setUuid] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = useSupabaseClient()
    const user = useUser()
    const isRefreshing = useRef(false)

    const fetchUuid = async (): Promise<string | null> => {
        // 1. Si hay usuario autenticado, SIEMPRE priorizar su ID
        if (user?.id) {
            const cachedUuid = uuidCache.get()
            // Si el cache tiene un UUID diferente, limpiarlo primero
            if (cachedUuid && cachedUuid !== user.id) {
                console.log('🔄 User changed, clearing old cache:', cachedUuid, '→', user.id)
                uuidCache.clear()
            }
            console.log('✅ UUID from session:', user.id)
            uuidCache.set(user.id)
            return user.id
        }

        // 2. Si no hay usuario, verificar cache
        const cachedUuid = uuidCache.get()
        if (cachedUuid) {
            console.log('✅ UUID from cache:', cachedUuid)
            return cachedUuid
        }

        // 3. Llamar RPC solo si no hay cache y no hay sesión
        try {
            console.log('🔄 Fetching UUID via RPC...')
            const { data: uuidData } = await supabase.rpc('get_usuario_uuid')

            const rpcUuid = typeof uuidData === 'string'
                ? uuidData
                : uuidData?.uuid || uuidData?.user_uuid || null

            if (rpcUuid) {
                console.log('✅ UUID via RPC:', rpcUuid)
                uuidCache.set(rpcUuid)
                return rpcUuid
            }
        } catch (e) {
            console.error('❌ RPC get_usuario_uuid error:', e)
        }

        // 4. Fallback UUID si todo falla
        const fallbackUuid = sessionStorage.getItem('vc_uuid') ||
            (typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2))

        try {
            sessionStorage.setItem('vc_uuid', fallbackUuid)
        } catch { }

        console.log('⚠️ UUID fallback:', fallbackUuid)
        return fallbackUuid
    }

    const refresh = async () => {
        if (isRefreshing.current) return

        isRefreshing.current = true
        setIsLoading(true)

        try {
            const newUuid = await fetchUuid()
            setUuid(newUuid)
        } finally {
            setIsLoading(false)
            isRefreshing.current = false
        }
    }

    const clearCache = () => {
        uuidCache.clear()
        setUuid(null)
    }

    // Inicialización
    useEffect(() => {
        refresh()
    }, [user?.id]) // Re-ejecutar solo cuando cambie el usuario

    return (
        <UserUuidContext.Provider value={{ uuid, isLoading, refresh, clearCache }}>
            {children}
        </UserUuidContext.Provider>
    )
}

export function useUserUuid() {
    const context = useContext(UserUuidContext)
    if (!context) {
        throw new Error('useUserUuid must be used within a UserUuidProvider')
    }
    return context
}

// Hook legacy para compatibilidad
export function useCachedUuid(): { uuid: string | null; isLoading: boolean } {
    const { uuid, isLoading } = useUserUuid()
    return { uuid, isLoading }
}