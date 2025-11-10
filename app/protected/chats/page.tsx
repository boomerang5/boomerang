'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Search, Plus, Send, Paperclip, User, X, Phone, MessageCircle } from 'lucide-react'
import { createClient } from '../../../utils/supabase/client'

// Tipos para los datos de chats
interface ChatData {
  id: number
  nombre: string
  id_tipo_chat: 1 | 2  // 1 = privado, 2 = grupal
  ultimo_mensaje?: string
  fecha_ultimo_mensaje?: string
  fecha_creacion?: string
  participantes?: any[]
}

export default function ChatsPage() {
  // Estados existentes
  const [activeTab, setActiveTab] = useState('todos') // 'todos', 'chats', 'grupos'
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  
  // Nuevos estados para funcionalidad
  const [userChats, setUserChats] = useState<ChatData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewChatMenu, setShowNewChatMenu] = useState(false)
  const [showContactsList, setShowContactsList] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contactsError, setContactsError] = useState<string | null>(null)
  const [creatingChat, setCreatingChat] = useState(false)
  
  // Estados para crear grupo
  const [showGroupTitleModal, setShowGroupTitleModal] = useState(false)
  const [showGroupContactsModal, setShowGroupContactsModal] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<any[]>([])
  
  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estado para el chat seleccionado con sus detalles
  const [selectedChatData, setSelectedChatData] = useState<ChatData | null>(null)
  
  // Estados para notificaciones y contadores de mensajes no leídos
  const [unreadCounts, setUnreadCounts] = useState<{ [chatId: string]: number }>({})
  
  // Estados para validación de chat existente
  const [showExistingChatModal, setShowExistingChatModal] = useState(false)
  const [existingChatData, setExistingChatData] = useState<{chat: any, contact: any} | null>(null)
  
  // Estado para el modal de participantes
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  
  // Estados para el modal de perfil de usuario
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null)
  
  // Estados para modales personalizados
  const [customAlert, setCustomAlert] = useState<{show: boolean, title: string, message: string, type: 'success' | 'error' | 'info'}>({
    show: false, title: '', message: '', type: 'info'
  })
  const [customConfirm, setCustomConfirm] = useState<{show: boolean, title: string, message: string, onConfirm: () => void}>({
    show: false, title: '', message: '', onConfirm: () => {}
  })
  
  const newChatMenuRef = useRef<HTMLDivElement>(null)

  // Función para obtener datos del chat seleccionado
  const getSelectedChatData = (chatId: string): ChatData | null => {
    return userChats.find(chat => {
      const currentChatId = (chat as any).id || (chat as any).id_chat
      return currentChatId?.toString() === chatId
    }) || null
  }

  // Función para marcar mensajes como leídos
  const markChatAsRead = (chatId: string) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev }
      delete newCounts[chatId]
      return newCounts
    })
  }

  // Función para incrementar contador de mensajes no leídos
  const incrementUnreadCount = (chatId: string) => {
    setUnreadCounts(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || 0) + 1
    }))
  }

  // Función para mover un chat al primer lugar cuando recibe mensaje nuevo
  const moveToTopAndUpdateLastMessage = (chatId: string, lastMessage: string, messageDate: string) => {
    setUserChats(prevChats => {
      // Deduplicar primero para evitar problemas
      const deduplicatedChats = prevChats.reduce((acc, current) => {
        const currentId = (current as any).id || (current as any).id_chat
        const exists = acc.some(chat => {
          const existingId = (chat as any).id || (chat as any).id_chat
          return existingId?.toString() === currentId?.toString()
        })
        if (!exists) acc.push(current)
        return acc
      }, [] as ChatData[])
      
      const chatIndex = deduplicatedChats.findIndex(chat => {
        const currentChatId = (chat as any).id || (chat as any).id_chat
        return currentChatId?.toString() === chatId
      })

      if (chatIndex === -1) return deduplicatedChats // Chat no encontrado

      const updatedChats = [...deduplicatedChats]
      const chatToMove = { ...updatedChats[chatIndex] }
      
      // Actualizar último mensaje y fecha
      chatToMove.ultimo_mensaje = lastMessage
      chatToMove.fecha_ultimo_mensaje = messageDate
      
      // Remover chat de su posición actual
      updatedChats.splice(chatIndex, 1)
      
      // Agregar al principio
      updatedChats.unshift(chatToMove)
      
      return updatedChats
    })
  }

  // Función para buscar si ya existe un chat privado con un contacto
  const findExistingPrivateChat = (contactId: number) => {
    return userChats.find(chat => {
      // Solo buscar en chats privados (id_tipo_chat === 1)
      if (chat.id_tipo_chat !== 1) return false
      
      // Buscar en participantes si coincide el id_usuario_contacto
      if (chat.participantes && Array.isArray(chat.participantes)) {
        return chat.participantes.some((participant: any) => 
          participant.id_usuario_contacto === contactId
        )
      }
      
      return false
    })
  }

  // Función para abrir el chat existente
  const openExistingChat = () => {
    if (existingChatData) {
      const chatId = (existingChatData.chat as any).id || (existingChatData.chat as any).id_chat

      
      // Seleccionar el chat existente
      setSelectedChat(chatId.toString())
      
      // Cerrar modales
      setShowExistingChatModal(false)
      setShowContactsList(false)
      setExistingChatData(null)
    }
  }

  // Función para cerrar el modal de chat existente
  const closeExistingChatModal = () => {
    setShowExistingChatModal(false)
    setExistingChatData(null)
  }

  // Efecto para actualizar datos del chat seleccionado
  useEffect(() => {
    if (selectedChat) {
      const chatData = getSelectedChatData(selectedChat)
      setSelectedChatData(chatData)
      
      // Marcar como leído cuando se abre el chat
      markChatAsRead(selectedChat)
    } else {
      setSelectedChatData(null)
    }
  }, [selectedChat, userChats])

  // Cerrar menú cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newChatMenuRef.current && !newChatMenuRef.current.contains(event.target as Node)) {
        setShowNewChatMenu(false)
      }
    }

    if (showNewChatMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNewChatMenu])

  // Función para resolver ID de usuario y token
  const resolveIdUsuarioAndToken = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuario no autenticado')
    }
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No se pudo obtener el token de acceso')
    }
    
    // Paso 1: Obtener id_usuario desde UUID usando el endpoint correcto
    const userUuidResponse = await fetch(`/api/users/uuid/${user.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!userUuidResponse.ok) {
      const errorText = await userUuidResponse.text()
      console.error('❌ Error en /api/users/uuid:', errorText)
      throw new Error(`Error al obtener información del usuario: ${errorText}`)
    }
    
    const responseText = await userUuidResponse.text()
    
    let userData
    try {
      userData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Error al parsear JSON del endpoint UUID:', parseError)
      throw new Error(`Respuesta inválida del servidor: ${responseText}`)
    }
    
    // Buscar el id_usuario en diferentes propiedades posibles
    const idUsuario = userData.id_usuario || userData.id || userData.userId || userData.user_id
    
    if (!idUsuario) {
      console.error('❌ No se encontró id_usuario en ninguna propiedad:', userData)
      throw new Error(`No se pudo obtener el id_usuario del backend. Datos recibidos: ${JSON.stringify(userData)}`)
    }
    
    return {
      idUsuario: idUsuario,
      accessToken: session.access_token
    }
  }

  // Funciones helper reutilizadas de contactos
  const fullName = (nombre?: string, apellido?: string) => {
    const n = nombre?.trim() || ''
    const a = apellido?.trim() || ''
    return `${n} ${a}`.trim() || 'Usuario'
  }

  const getJwt = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  // Función para enviar solicitud de contacto (reutilizada de contactos page)
  const sendContactRequest = async (idReceptor: number) => {
    try {
      const { idUsuario } = await resolveIdUsuarioAndToken()
      const supabase = createClient()
      
      // Verificar si ya son contactos
      const { data: existingContact } = await supabase
        .from('Agenda')
        .select('id')
        .or(`and(id_usuario.eq.${idUsuario},id_usuario_contacto.eq.${idReceptor}),and(id_usuario.eq.${idReceptor},id_usuario_contacto.eq.${idUsuario})`)
        .single()

      if (existingContact) {
        setCustomAlert({
          show: true,
          title: 'Información',
          message: 'Ya son contactos',
          type: 'info'
        })
        return
      }

      // Verificar si ya hay una solicitud pendiente
      const { data: existingRequest } = await supabase
        .from('SolicitudContacto')
        .select('id')
        .or(`and(id_solicitante.eq.${idUsuario},id_receptor.eq.${idReceptor}),and(id_solicitante.eq.${idReceptor},id_receptor.eq.${idUsuario})`)
        .eq('estado', 'pendiente')
        .single()

      if (existingRequest) {
        setCustomAlert({
          show: true,
          title: 'Información',
          message: 'Ya hay una solicitud pendiente entre ustedes',
          type: 'info'
        })
        return
      }

      // Crear la solicitud
      const { error } = await supabase
        .from('SolicitudContacto')
        .insert({
          id_solicitante: idUsuario,
          id_receptor: idReceptor,
          fecha_solicitud: new Date().toISOString(),
          estado: 'pendiente'
        })

      if (error) {
        console.error('Error al enviar solicitud:', error)
        setCustomAlert({
          show: true,
          title: 'Error',
          message: 'No se pudo enviar la solicitud',
          type: 'error'
        })
        return
      }

      setCustomAlert({
        show: true,
        title: '¡Éxito!',
        message: 'Solicitud de contacto enviada',
        type: 'success'
      })
      
    } catch (error) {
      console.error('Error al enviar solicitud:', error)
      setCustomAlert({
        show: true,
        title: 'Error',
        message: 'Error al enviar la solicitud',
        type: 'error'
      })
    }
  }

  // Función para obtener información detallada de un chat
  const getChatInfo = async (idUsuario: number, idChat: number, accessToken: string) => {
    try {
      const url = `/api/chats/info?id_usuario=${idUsuario}&id_chat=${idChat}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      const responseText = await response.text()
      
      if (!response.ok) {
        console.error(`❌ Error ${response.status} al obtener info del chat ${idChat}:`, responseText)
        return null
      }

      try {
        const chatInfo = JSON.parse(responseText)
        return chatInfo
      } catch (parseError) {
        console.error(`❌ Error al parsear respuesta del chat ${idChat}:`, parseError)
        return null
      }
    } catch (err) {
      console.error(`❌ Error de red/general al obtener info del chat ${idChat}:`, err)
      return null
    }
  }

  // Función para enriquecer chats con información detallada
  const enrichChatsWithInfo = async (chats: ChatData[], idUsuario: number, accessToken: string) => {
    
    // Procesar todos los chats en paralelo
    const enrichedChats = await Promise.all(chats.map(async (chat) => {
      const chatId = (chat as any).id || (chat as any).id_chat
      
      if (!chatId) {
        return chat
      }

      try {
        const chatInfo = await getChatInfo(idUsuario, chatId, accessToken)
        if (chatInfo) {
          // Combinar datos del chat con la información detallada
          return {
            ...chat,
            fecha_creacion: chatInfo.fecha_creacion || chatInfo.fechaCreacion || chatInfo.created_at,
            ...chatInfo
          }
        }
      } catch (error) {
        // Error silencioso para no saturar logs
      }

      return chat // Si falla, devolver chat sin enriquecer
    }))
    return enrichedChats
  }

  // Función para cargar chats del usuario
  const loadUserChats = async () => {
    try {
      setLoading(true)
      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken()
      
      // 1. Obtener chats básicos con límite inicial
      const response = await fetch(`/api/chats/user?id_usuario=${idUsuario}&limit=20`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Error al cargar chats (${response.status})`)
      }

      const data = await response.json()
      const baseChats = Array.isArray(data) ? data : []
      
      if (baseChats.length === 0) {
        setUserChats([])
        return
      }

      // 2. Mostrar inmediatamente los chats básicos ordenados
      const sortedBaseChats = sortChatsByDate(baseChats)
   
      setUserChats(sortedBaseChats)
      setLoading(false) // Quitar loading después de mostrar datos básicos
      
      // 3. Enriquecer chats en lotes para mejor rendimiento
      const enrichChatsInBatches = async (chats: ChatData[]) => {
        const BATCH_SIZE = 5 // Procesar 5 chats a la vez
        const enrichedChats = [...chats]

        for (let i = 0; i < chats.length; i += BATCH_SIZE) {
          const batch = chats.slice(i, i + BATCH_SIZE)
          const enrichedBatch = await Promise.all(
            batch.map(async (chat) => {
              const chatId = (chat as any).id || (chat as any).id_chat
              if (!chatId) return chat

              try {
                const chatInfo = await getChatInfo(idUsuario, chatId, accessToken)
                if (chatInfo) {
                  return {
                    ...chat,
                    ...chatInfo,
                    fecha_creacion: chatInfo.fecha_creacion || chatInfo.fechaCreacion || chatInfo.created_at
                  }
                }
              } catch (error) {
                console.error(`Error al obtener info para chat ${chatId}:`, error)
              }
              return chat
            })
          )

          // Actualizar la lista con cada lote procesado
          enrichedChats.splice(i, enrichedBatch.length, ...enrichedBatch)
          const sortedEnrichedChats = sortChatsByDate(enrichedChats)
          setUserChats(sortedEnrichedChats)

          // Pequeña pausa entre lotes para no sobrecargar
          if (i + BATCH_SIZE < chats.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        return enrichedChats
      }

      // 4. Iniciar el enriquecimiento en segundo plano
      setTimeout(() => {
        enrichChatsInBatches(sortedBaseChats).catch(error => {
          console.error('Error al enriquecer chats:', error)
        })
      }, 100)

    } catch (err) {
      console.error('Error en loadUserChats:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Función para crear un chat privado
  const createPrivateChat = async (contact: any) => {
    try {
      // VALIDAR SI YA EXISTE EL CHAT
      const existingChat = findExistingPrivateChat(contact.id_usuario_contacto)
      
      if (existingChat) {
        // Mostrar modal de confirmación
        setExistingChatData({ chat: existingChat, contact })
        setShowExistingChatModal(true)
        return // No crear chat nuevo
      }
      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken()
      
      const chatData = {
        id_usuario: idUsuario, // Usuario que crea el chat
        id_contacto: contact.id_usuario_contacto, // ID del contacto (viene de misContactos)
        id_tipo_chat: 1 // 1 = chat privado
      }
      
      const response = await fetch('/api/chats/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chatData)
      })
      
      if (response.ok) {
        const responseText = await response.text()
        
        let newChat
        try {
          newChat = JSON.parse(responseText)
        } catch (parseError) {
          console.error('❌ Error al parsear JSON de nuevo chat:', parseError)
          throw new Error(`Respuesta inválida del servidor: ${responseText}`)
        }
        
        // Obtener información detallada del chat recién creado
        const newChatId = (newChat as any).id || (newChat as any).id_chat || (newChat as any).chatId
        let chatInfo = null
        if (newChatId) {
          try {
            chatInfo = await getChatInfo(idUsuario, newChatId, accessToken)
          } catch (error) {
            // Usar fecha actual si no se puede obtener info
          }
        }
        
        // Crear objeto de chat con estructura completa
        const chatToAdd: ChatData = {
          id: newChatId || Date.now(),
          nombre: (contact.nombre && contact.apellido) ? `${contact.nombre} ${contact.apellido}` : (contact.nombre || 'Chat privado'),
          id_tipo_chat: 1, // Chat privado
          ultimo_mensaje: undefined,
          fecha_ultimo_mensaje: undefined,
          fecha_creacion: chatInfo?.fecha_creacion || chatInfo?.fechaCreacion || chatInfo?.created_at || new Date().toISOString(),
          participantes: [contact]
        }
        
        // Agregar el nuevo chat al principio de la lista y reordenar
        const updatedChats = sortChatsByDate([chatToAdd, ...userChats])
        setUserChats(updatedChats)
        
        // Seleccionar el nuevo chat
        if (newChatId) {
          setSelectedChat(newChatId.toString())
        }
        return newChat
      } else {
        const errorText = await response.text()
        console.error('❌ Error del servidor al crear chat:', response.status, errorText)
        throw new Error(`Error al crear chat (${response.status}): ${errorText}`)
      }
    } catch (err) {
      console.error('❌ Error general en createPrivateChat:', err)
      console.error('❌ Stack trace:', err instanceof Error ? err.stack : err)
      throw err
    }
  }

  // Función para crear un grupo
  const createGroupChat = async () => {
    try {
      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken()
      
      // Preparar datos según el swagger de create-group-with-chat
      const participantes = selectedContacts.map(contact => contact.id_usuario_contacto).filter(id => id)
      
      const chatData = {
        id_usuario_creador: idUsuario, // Usuario que crea el grupo
        nombre: groupTitle, // Título del grupo
        descripcion: "", // Descripción opcional (vacía por ahora)
        participantes: participantes // Array de IDs de usuarios participantes
      }
      
      const response = await fetch('/api/chats/create-group-with-chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chatData)
      })
      
      if (response.ok) {
        const responseText = await response.text()
        
        let newGroup
        try {
          newGroup = JSON.parse(responseText)
        } catch (parseError) {
          console.error('❌ Error al parsear JSON de nuevo grupo:', parseError)
          throw new Error(`Respuesta inválida del servidor: ${responseText}`)
        }
        
        // Limpiar estados del modal
        setShowGroupContactsModal(false)
        setGroupTitle('')
        setSelectedContacts([])
        
        // Obtener información detallada del grupo recién creado
        const newGroupId = (newGroup as any).id || (newGroup as any).id_chat || (newGroup as any).chatId
        let groupInfo = null
        if (newGroupId) {
          try {
            groupInfo = await getChatInfo(idUsuario, newGroupId, accessToken)
          } catch (error) {
            // Usar fecha actual si no se puede obtener info
          }
        }
        
        // Crear objeto de grupo con estructura completa
        const groupToAdd: ChatData = {
          id: newGroupId || Date.now(),
          nombre: groupTitle,
          id_tipo_chat: 2, // Chat grupal
          ultimo_mensaje: undefined,
          fecha_ultimo_mensaje: undefined,
          fecha_creacion: groupInfo?.fecha_creacion || groupInfo?.fechaCreacion || groupInfo?.created_at || new Date().toISOString(),
          participantes: selectedContacts
        }
        
        // Agregar el nuevo grupo al principio de la lista y reordenar
        const updatedChats = sortChatsByDate([groupToAdd, ...userChats])
        setUserChats(updatedChats)
        
        // Seleccionar el nuevo grupo
        if (newGroupId) {
          setSelectedChat(newGroupId.toString())
        }
        
        return newGroup
      } else {
        const errorText = await response.text()
        console.error('❌ Error al crear grupo:', response.status, errorText)
        throw new Error(`Error al crear grupo (${response.status}): ${errorText}`)
      }
    } catch (err) {
      console.error('❌ Error general en createGroupChat:', err)
      throw err
    }
  }

  // Función para cargar contactos del usuario
  const loadUserContacts = async () => {
    setLoadingContacts(true)
    setContactsError(null)
    
    try {
      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken()
      

      
      const response = await fetch(`/api/contacts/misContactos?id_usuario=${idUsuario}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const responseText = await response.text()
        
        let data
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error('❌ Error al parsear JSON de contactos:', parseError)
          throw new Error(`Respuesta inválida del servidor de contactos: ${responseText}`)
        }
        

        setContacts(Array.isArray(data) ? data : [])
      } else {
        const errorText = await response.text()
        console.error('❌ Error al cargar contactos:', response.status, errorText)
        throw new Error(`Error al cargar contactos (${response.status}): ${errorText}`)
      }
    } catch (err) {
      console.error('❌ Error general en loadUserContacts:', err)
      setContactsError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoadingContacts(false)
    }
  }

  // Función para ordenar chats por fecha (más reciente primero)
  const sortChatsByDate = (chats: ChatData[]) => {
    return [...chats].sort((a, b) => {
      // Priorizar por fecha_ultimo_mensaje si está disponible (más importante para notificaciones)
      if (a.fecha_ultimo_mensaje && b.fecha_ultimo_mensaje) {
        return new Date(b.fecha_ultimo_mensaje).getTime() - new Date(a.fecha_ultimo_mensaje).getTime()
      }
      
      // Si uno tiene último mensaje y el otro no, priorizar el que tiene
      if (a.fecha_ultimo_mensaje && !b.fecha_ultimo_mensaje) return -1
      if (!a.fecha_ultimo_mensaje && b.fecha_ultimo_mensaje) return 1
      
      // Luego por fecha_creacion si está disponible
      if (a.fecha_creacion && b.fecha_creacion) {
        return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
      }
      
      // Dar prioridad a chats con fecha_creacion sobre los que no la tienen
      if (a.fecha_creacion && !b.fecha_creacion) return -1
      if (!a.fecha_creacion && b.fecha_creacion) return 1
      
      // Si ninguno tiene fecha, ordenar por ID (más alto = más reciente)
      const idA = (a as any).id || (a as any).id_chat || 0
      const idB = (b as any).id || (b as any).id_chat || 0
      return idB - idA
    })
  }

  // useEffect para cargar chats al montar el componente
  useEffect(() => {
    loadUserChats()
  }, [])

  // ------------------ Realtime messages (Supabase) ------------------
  const supabase = createClient()
  const [messages, setMessages] = useState<any[]>([])
  const [messageText, setMessageText] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)
  const channelRef = useRef<any>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const currentEmisorRef = useRef<number | null>(null)
  const globalChannelRef = useRef<any>(null) // Canal para escuchar todos los chats del usuario

  const scrollToBottom = () => {
    try {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    } catch (e) {
      console.warn('⚠️ Error al scrollear:', e)
    }
  }

  const loadHistory = async (chatId: number) => {
    try {
      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken()
      
      try {
        // MÉTODO 1: Intentar usar el endpoint del backend que aplica soft delete correctamente
        const response = await fetch(`/api/mensaje/chat-messages?id_chat=${chatId}&id_usuario=${idUsuario}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Backend error: ${response.status}`)
        }

        const mensajes = await response.json()
        setMessages(mensajes || [])
      } catch (backendError) {
        console.warn('⚠️ Backend fallido, usando Supabase directo:', backendError)
        
        // MÉTODO 2: Fallback - usar Supabase directo (método anterior)
        let query = supabase
          .from('Mensaje')
          .select(`
            *,
            Usuario:id_emisor (
              nombre,
              apellido,
              apodo
            )
          `)
          .eq('id_chat', chatId)
          .order('fecha', { ascending: true })
          .limit(200)

        if (onlyActive) {
          query = query.is('eliminado', false)
        }

        const { data: mensajes, error } = await query

        if (error) {
          console.error('❌ Error cargando historial con Supabase:', error)
          return
        }

        setMessages(mensajes || [])
      }
      // wait a tick then scroll
      setTimeout(scrollToBottom, 50)
    } catch (err) {
      console.error('❌ loadHistory error:', err)
    }
  }

  const unsubscribeChannel = async () => {
    try {
      if (channelRef.current) {
        try {
          await channelRef.current.unsubscribe()
        } catch (e) {
          // some versions use .unsubscribe() sync
          try { channelRef.current.unsubscribe() } catch {}
        }
        channelRef.current = null
      }
    } catch (e) {
      console.warn('⚠️ Error al unsubscribir canal:', e)
    }
  }

  const joinChatRealtime = async (chatIdStr: string | null) => {
    // chatIdStr may be null when closing the panel
    if (!chatIdStr) {
      await unsubscribeChannel()
      setMessages([])
      return
    }

    const chatId = Number(chatIdStr)
    if (!Number.isFinite(chatId)) {
      console.warn('ID de chat inválido para joinChatRealtime:', chatIdStr)
      return
    }

    // get emisor id (usuario)
    let idUsuario = null
    try {
      const resolved = await resolveIdUsuarioAndToken()
      idUsuario = resolved.idUsuario
      currentEmisorRef.current = idUsuario
    } catch (err) {
      console.error('❌ No se pudo resolver idUsuario para realtime:', err)
      currentEmisorRef.current = null
    }

    // Unsubscribe previo
    await unsubscribeChannel()

    // Crear canal y suscribirse a INSERT / UPDATE
    try {
      const ch = supabase
        .channel(`mensaje-chat-${chatId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'Mensaje', filter: `id_chat=eq.${chatId}` },
          async (payload: any) => {
            const row = payload.new
            if (onlyActive && row.eliminado === true) return

            // Verificar si el usuario eliminó este chat
            const { idUsuario } = await resolveIdUsuarioAndToken()
            const { data: chatEliminado } = await supabase
              .from('ChatEliminado')
              .select('fecha_eliminado')
              .eq('id_chat', chatId)
              .eq('id_usuario', idUsuario)
              .order('fecha_eliminado', { ascending: false })
              .limit(1)
              .single()

            // Si el chat fue eliminado y el mensaje es anterior a la eliminación, no mostrarlo
            if (chatEliminado && new Date(row.fecha) <= new Date(chatEliminado.fecha_eliminado)) {
              return
            }

            // Obtener información del usuario emisor
            const { data: userData } = await supabase
              .from('Usuario')
              .select('nombre, apellido, apodo')
              .eq('id', row.id_emisor)
              .single()

            const messageWithUser = {
              ...row,
              Usuario: userData
            }

            setMessages(prev => {
              // evitar duplicados
              if (prev.some(m => m.id === row.id)) return prev
              return [...prev, messageWithUser]
            })
            setTimeout(scrollToBottom, 30)
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'Mensaje', filter: `id_chat=eq.${chatId}` },
          (payload: any) => {
            const row = payload.new
            if (onlyActive && row.eliminado === true) {
              setMessages(prev => prev.filter(m => m.id !== row.id))
              return
            }
            setMessages(prev => prev.map(m => (m.id === row.id ? row : m)))
          }
        )

      ch.subscribe((status: any) => {

      })

      channelRef.current = ch
    } catch (err) {
      console.error('❌ Error creando canal realtime:', err)
    }

    // Cargar historial
    await loadHistory(chatId)
  }

  const sendMessage = async () => {
    const texto = messageText.trim()
    if (!texto) return
    if (!selectedChat) {
      setCustomAlert({
        show: true,
        title: 'Atención',
        message: 'Seleccioná un chat primero',
        type: 'info'
      });
      return
    }

    let idUsuario = null
    try {
      const resolved = await resolveIdUsuarioAndToken()
      idUsuario = resolved.idUsuario
    } catch (err) {
      console.error('❌ No se pudo resolver usuario para enviar mensaje:', err)
      setCustomAlert({
        show: true,
        title: 'Error',
        message: 'No estás autenticado',
        type: 'error'
      });
      return
    }

    const chatIdNum = Number(selectedChat)
    try {
      const { data, error } = await supabase
        .from('Mensaje')
        .insert({ id_chat: chatIdNum, id_emisor: idUsuario, texto })
        .select()
        .single()

      if (error) {
        console.error('❌ Error al enviar mensaje:', error)
        setCustomAlert({
          show: true,
          title: 'Error',
          message: 'Error al enviar: ' + (error.message || 'desconocido'),
          type: 'error'
        });
        return
      }

      setMessageText('')
      
      // 🚀 OPTIMIZACIÓN: Mover el chat al tope inmediatamente
      const currentTime = new Date().toISOString()
      moveToTopAndUpdateLastMessage(selectedChat, texto, currentTime)
    } catch (err) {
      console.error('❌ sendMessage error:', err)
    }
  }

  // Suscribirse/desuscribirse cuando cambia selectedChat o onlyActive
  useEffect(() => {
    joinChatRealtime(selectedChat)
    return () => { unsubscribeChannel() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, onlyActive])

  // ------------------ Canal global para notificaciones ------------------
  const setupGlobalNotifications = async () => {
    try {
      // Obtener ID del usuario
      const { idUsuario } = await resolveIdUsuarioAndToken()
      currentEmisorRef.current = idUsuario

      // Desuscribirse del canal previo si existe
      if (globalChannelRef.current) {
        try {
          await globalChannelRef.current.unsubscribe()
        } catch {}
        globalChannelRef.current = null
      }

      // Crear canal para todos los mensajes donde el usuario participa
      const globalChannel = supabase
        .channel(`user-notifications-${idUsuario}`)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'Mensaje'
          },
          (payload: any) => {
            const message = payload.new
            const chatId = message.id_chat?.toString()
            const emisorId = message.id_emisor
            
            // Verificar si este chat está en la lista del usuario
            const chatExists = userChats.some(chat => {
              const currentChatId = ((chat as any).id || (chat as any).id_chat)?.toString()
              return currentChatId === chatId
            })

            if (chatExists && chatId) {
              // Si el mensaje NO es del usuario actual Y no es el chat abierto -> incrementar contador
              if (emisorId !== idUsuario && selectedChat !== chatId) {
                incrementUnreadCount(chatId)
              }
              
              // SIEMPRE mover chat al principio y actualizar último mensaje (tanto para emisor como receptor)
              moveToTopAndUpdateLastMessage(
                chatId, 
                message.texto || 'Nuevo mensaje', 
                message.fecha || new Date().toISOString()
              )
            }
          }
        )

      globalChannel.subscribe((status: any) => {

      })

      globalChannelRef.current = globalChannel
    } catch (err) {
      console.error('❌ Error configurando notificaciones globales:', err)
    }
  }

  // Configurar notificaciones globales cuando se cargan los chats
  useEffect(() => {
    if (userChats.length > 0) {
      setupGlobalNotifications()
    }
    return () => {
      if (globalChannelRef.current) {
        try {
          globalChannelRef.current.unsubscribe()
        } catch {}
        globalChannelRef.current = null
      }
    }
  }, [userChats.length])  // Solo cuando cambia la cantidad de chats


  return (
    <div className="flex min-h-screen bg-orange-50 dark:bg-[#0d0d0d] items-start justify-center">
      <div className="flex gap-6 p-6">
        {/* Panel Izquierdo - Lista de Chats */}
        <aside className="bg-white/70 dark:bg-gray-800 p-6 flex flex-col gap-4 shadow-lg rounded-2xl h-[600px]">
        {/* Header del Panel Izquierdo */}
        <div className="mb-4">
          <h1 className="text-lg font-bold text-gray-700 mb-2">Mis chats</h1>

          {/* Barra de Búsqueda */}
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-12 py-2 rounded-full border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                placeholder="Buscar contacto o chat..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="relative" ref={newChatMenuRef}>
              <button
                onClick={() => setShowNewChatMenu(!showNewChatMenu)}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow transition"
                title="Nuevo chat"
              >
                <Plus size={16} />
              </button>
              
              {/* Menú desplegable para nuevo chat */}
              {showNewChatMenu && (
                <div className="absolute top-10 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-48 z-10">
                  <button
                    onClick={() => {
                      setShowNewChatMenu(false)
                      setShowContactsList(true)
                      loadUserContacts()
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-medium">👤</span>
                    </div>
                    Crear chat privado
                  </button>
                  <button
                    onClick={() => {
                      setShowNewChatMenu(false)
                      setShowGroupTitleModal(true)
                      setGroupTitle('')
                      setSelectedContacts([])
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-xs font-medium">👥</span>
                    </div>
                    Crear chat grupal
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pestañas Todos/Chats/Grupos */}
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition ${
                activeTab === 'todos'
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition ${
                activeTab === 'chats'
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
              }`}
            >
              Privados
            </button>
            <button
              onClick={() => setActiveTab('grupos')}
              className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition ${
                activeTab === 'grupos'
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
              }`}
            >
              Grupos
            </button>
          </div>
        </div>

        {/* Lista de Chats */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            {activeTab === 'todos' ? 'Todas las conversaciones' : activeTab === 'chats' ? 'Privados' : 'Grupos'}
          </h3>
          <ul className="flex flex-col gap-2">
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-4">Cargando conversaciones...</p>
            ) : error ? (
              <p className="text-sm text-red-500 text-center py-4">Error: {error}</p>
            ) : (() => {
              // Filtrar según la pestaña activa
              let filteredChats = userChats
              if (activeTab === 'chats') {
                filteredChats = userChats.filter(chat => {
                  const tipoChat = chat.id_tipo_chat || (chat as any).tipo_chat
                  return tipoChat === 1 || tipoChat === '1'
                })
              } else if (activeTab === 'grupos') {
                filteredChats = userChats.filter(chat => {
                  const tipoChat = chat.id_tipo_chat || (chat as any).tipo_chat
                  return tipoChat === 2 || tipoChat === '2'
                })
              }
              // Si activeTab === 'todos', no filtramos por tipo (mostramos todos)

              // Filtrar por término de búsqueda
              if (searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase().trim()
                filteredChats = filteredChats.filter(chat => {
                  // Buscar en el nombre del chat
                  const nombreMatch = chat.nombre?.toLowerCase().includes(searchLower)
                  // Buscar en el último mensaje si existe
                  const mensajeMatch = chat.ultimo_mensaje?.toLowerCase().includes(searchLower)
                  
                  return nombreMatch || mensajeMatch
                })
              }

              // Aplicar ordenamiento a los chats filtrados
              filteredChats = sortChatsByDate(filteredChats)

              if (filteredChats.length === 0) {
                let mensaje = ''
                if (searchTerm.trim()) {
                  mensaje = `No se encontraron resultados para "${searchTerm}"`
                } else {
                  mensaje = activeTab === 'todos' 
                    ? 'No hay conversaciones.' 
                    : activeTab === 'chats' 
                      ? 'No hay chats privados.' 
                      : 'No hay grupos.'
                }
                return <p className="text-sm text-gray-500 text-center py-4">{mensaje}</p>
              }

              return filteredChats.map((chat, index) => {
                const tipoChat = chat.id_tipo_chat || (chat as any).tipo_chat
                const initials = chat.nombre?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 
                  ((tipoChat === 1 || tipoChat === '1') ? 'CH' : 'GR')
                const chatId = (chat as any).id || (chat as any).id_chat || (chat as any).chatId || 
                  `${(tipoChat === 1 || tipoChat === '1') ? 'chat' : 'group'}-${index}`
                
                // Crear key única combinando tipo, ID y posición para evitar duplicados
                const uniqueKey = `${tipoChat}-${chatId}-${index}`
                
                return (
                  <li key={uniqueKey}>
                    <div
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-orange-100 bg-white hover:bg-orange-50 transition font-medium shadow-sm cursor-pointer ${
                        selectedChat === chatId.toString()
                          ? "bg-orange-100 text-orange-600"
                          : "text-gray-700"
                      }`}
                      onClick={() => setSelectedChat(chatId.toString())}
                    >
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{chat.nombre}</span>
                          {(activeTab === 'todos' || activeTab === 'grupos') && (() => {
                            const tipoChat = chat.id_tipo_chat || (chat as any).tipo_chat
                            return tipoChat === 2 || tipoChat === '2'
                          })() && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">
                              Grupo
                            </span>
                          )}
                          {/* Contador de mensajes no leídos */}
                          {unreadCounts[chatId.toString()] && unreadCounts[chatId.toString()] > 0 && (
                            <span className="bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ml-auto">
                              {unreadCounts[chatId.toString()]}
                            </span>
                          )}
                        </div>
                        {chat.ultimo_mensaje && (
                          <p className="text-xs text-gray-500 truncate">{chat.ultimo_mensaje}</p>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })
            })()}
          </ul>
        </div>
      </aside>

      {/* Panel Derecho - Área de Conversación */}
      <main className="flex flex-col items-center justify-center bg-white/70 rounded-2xl shadow p-6 h-[600px] w-[800px]">
        {selectedChat && selectedChatData ? (
          <div className="w-full h-full flex flex-col min-h-0">
            {/* Header del Chat */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {(() => {
                      const tipoChat = selectedChatData.id_tipo_chat || (selectedChatData as any).tipo_chat
                      if (tipoChat === 1 || tipoChat === '1') {
                        // Chat privado - usar iniciales del nombre del contacto
                        return selectedChatData.nombre?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'CH'
                      } else {
                        // Chat grupal - usar iniciales del nombre del grupo
                        return selectedChatData.nombre?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'GR'
                      }
                    })()}
                  </span>
                </div>
                <div 
                  className="flex flex-col cursor-pointer hover:opacity-80"
                  onClick={() => {
                    const tipoChat = selectedChatData.id_tipo_chat || (selectedChatData as any).tipo_chat
                    if (tipoChat === 2 || tipoChat === '2') {
                      // Para grupos: mostrar lista de participantes
                      setShowParticipantsModal(true);
                    } else {
                      // Para chats privados: ir directo al modal de perfil
                      // Buscar el otro participante (que no sea yo)
                      if (selectedChatData.participantes && selectedChatData.participantes.length > 0) {
                        const otroParticipante = selectedChatData.participantes.find(p => 
                          p.id_usuario !== currentEmisorRef.current
                        );
                        if (otroParticipante) {
                          setSelectedUserProfile(otroParticipante);
                          setShowUserProfileModal(true);
                        }
                      }
                    }
                  }}
                >
                  <span className="font-bold text-lg text-gray-700 flex items-center gap-2">
                    {selectedChatData.nombre || 'Chat sin nombre'}
                    {(() => {
                      const tipoChat = selectedChatData.id_tipo_chat || (selectedChatData as any).tipo_chat
                      return (tipoChat === 2 || tipoChat === '2') && (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-4 w-4 text-gray-400" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )
                    })()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(() => {
                      const tipoChat = selectedChatData.id_tipo_chat || (selectedChatData as any).tipo_chat
                      return (tipoChat === 1 || tipoChat === '1') ? 'Chat privado' : 'Chat grupal'
                    })()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full p-2 hover:bg-red-50 text-red-500 hover:text-red-600"
                  title="Eliminar chat"
                  onClick={() => {
                    setCustomConfirm({
                      show: true,
                      title: '¿Estás seguro?',
                      message: '¿Estás seguro de que quieres eliminar este chat?',
                      onConfirm: async () => {
                        try {
                          const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();
                          
                          // Obtener el ID correcto del chat y validar datos
                          const chatId = Number((selectedChatData as any).id || 
                                       (selectedChatData as any).id_chat || 
                                       selectedChat);

                          if (!chatId || isNaN(chatId)) {
                            throw new Error('ID de chat inválido');
                          }

                          if (!idUsuario) {
                            throw new Error('ID de usuario no disponible');
                          }

                          // 1. Solo eliminar la participación del usuario en el chat (soft delete)

                          // 2. Luego eliminar el chat
                          const deleteData = {
                            id_chat: chatId,
                            id_emisor: idUsuario
                          };


                          const response = await fetch('/api/chats/delete', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${accessToken}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(deleteData)
                          });

                          const responseText = await response.text();

                          if (!response.ok) {
                            throw new Error(`Error ${response.status}: ${responseText}`);
                          }
                          
                          // Actualizar la lista de chats
                          setUserChats(prevChats => 
                            prevChats.filter(chat => {
                              const currentChatId = (chat as any).id || (chat as any).id_chat;
                              return currentChatId?.toString() !== chatId?.toString();
                            })
                          );
                          setSelectedChat(null);
                          
                          // Notificar al usuario
                          setCustomAlert({
                            show: true,
                            title: '¡Éxito!',
                            message: 'Chat eliminado correctamente',
                            type: 'success'
                          });
                        } catch (error) {
                          console.error('❌ Error detallado al eliminar el chat:', error);
                          setCustomAlert({
                            show: true,
                            title: 'Error',
                            message: error instanceof Error ? error.message : 'No se pudo eliminar el chat. Por favor intenta de nuevo.',
                            type: 'error'
                          });
                        }
                      }
                    })
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  className="rounded-full p-2 hover:bg-gray-100"
                  title="Cerrar"
                  onClick={() => setSelectedChat(null)}
                >
                  ✕
                </button>
              </div>
            </div>
            {/* Línea superior */}
            <div className="border-t border-gray-200 mb-2" />

            {/* Área de Mensajes (realtime) */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center mt-4">Sin mensajes en este chat</p>
                ) : (
                  messages.map((m: any) => {
                    const isMine = m.id_emisor === currentEmisorRef.current;
                    const time = m.fecha ? new Date(m.fecha).toLocaleTimeString() : '';
                    const tipoChat = selectedChatData.id_tipo_chat || (selectedChatData as any).tipo_chat
                    const isGroupChat = tipoChat === 2 || tipoChat === '2';
                    

                    
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className="flex flex-col">
                          {!isMine && (
                            <div className="text-sm text-gray-600 font-medium ml-2 mb-1">
                              {(() => {
                                // Debug temporal - revisar estructura del mensaje
                                if (m.id_emisor === 1) { // Solo log para el Usuario 1 para no spam
                                  console.log('🔍 Estructura mensaje:', m);
                                  console.log('🔍 Usuario info:', m.Usuario);
                                  console.log('🔍 Apodo directo:', m.apodo);
                                }
                                
                                // Revisar múltiples posibles ubicaciones del apodo
                                const apodo = m.Usuario?.apodo || m.apodo || null;
                                const nombreCompleto = m.Usuario 
                                  ? `${m.Usuario.nombre} ${m.Usuario.apellido || ''}`.trim()
                                  : null;
                                
                                if (apodo) return apodo;
                                if (nombreCompleto) return nombreCompleto;
                                return `Usuario ${m.id_emisor}`;
                              })()}
                            </div>
                          )}
                          <div className={`${isMine ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'bg-orange-100 text-orange-700'} max-w-xs px-4 py-2 rounded-xl font-medium shadow`}>
                            <div>{m.texto}</div>
                            <div className={`${isMine ? 'text-white/80' : 'text-orange-600'} text-xs mt-1 text-right`}>{time}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                </div>

              {/* Línea inferior */}
              <div className="border-t border-gray-200 mt-2" />

              {/* Input para Enviar Mensajes (realtime) */}
              <form
                onSubmit={e => { e.preventDefault(); sendMessage() }}
                className="w-full flex items-center gap-2 mt-2 p-1"
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  className="flex-1 rounded-full border-2 border-orange-200 px-4 py-2 focus:outline-none focus:border-orange-500 bg-white transition-colors"
                  placeholder={`Mensaje para ${selectedChatData.nombre || 'este chat'}...`}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-6 py-2 rounded-full font-semibold shadow hover:opacity-90 transition"
                >
                  Enviar
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Estado Inicial - Sin Chat Seleccionado */
          <div className="text-center text-gray-500">
            <div className="mb-6">
              <img 
                src="/mascota.png" 
                alt="Mascota Boomerang" 
                className="w-32 h-32 mx-auto object-contain"
              />
            </div>
            <h3 className="text-lg font-medium mb-2">Selecciona un chat</h3>
            <p>Elige una conversación para comenzar a chatear</p>
          </div>
        )}
      </main>
      </div>

      {/* Modal para seleccionar contacto */}
      {showContactsList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-96 overflow-hidden">
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">Seleccionar contacto</h2>
                <button
                  onClick={() => setShowContactsList(false)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">Elige un contacto para iniciar un chat privado</p>
            </div>

            {/* Lista de contactos */}
            <div className="overflow-y-auto max-h-80 relative">
              {creatingChat && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Creando chat...</p>
                  </div>
                </div>
              )}
              {loadingContacts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Cargando contactos...</p>
                  </div>
                </div>
              ) : contactsError ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-red-500">Error: {contactsError}</p>
                  <button
                    onClick={loadUserContacts}
                    className="mt-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition"
                  >
                    Reintentar
                  </button>
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500">No tienes contactos disponibles</p>
                </div>
              ) : (
                <div className="p-4">
                  {contacts.map((contact, index) => {
                    const initials = ((contact.nombre && contact.apellido) 
                      ? `${contact.nombre[0]}${contact.apellido[0]}` 
                      : contact.nombre?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'CO'
                    ).toUpperCase()
                    return (
                      <div
                        key={contact.id || index}
                        onClick={async () => {
                          try {

                            setCreatingChat(true)
                            await createPrivateChat(contact)
                            setShowContactsList(false)
                          } catch (error) {
                            console.error('❌ Error al crear chat privado:', error)
                            // Mostrar error al usuario
                            setCustomAlert({
                              show: true,
                              title: 'Error',
                              message: `Error al crear chat: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                              type: 'error'
                            });
                          } finally {
                            setCreatingChat(false)
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition"
                      >
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">{initials}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{(contact.nombre && contact.apellido) ? `${contact.nombre} ${contact.apellido}` : contact.nombre || 'Sin nombre'}</p>
                          {contact.email && (
                            <p className="text-xs text-gray-500">{contact.email}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para título del grupo */}
      {showGroupTitleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            {/* Header del modal */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-800">Crear grupo</h2>
                <button
                  onClick={() => setShowGroupTitleModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600">Escribe un nombre para tu grupo</p>
            </div>

            {/* Input para título */}
            <div className="mb-6">
              <input
                type="text"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Nombre del grupo..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                maxLength={50}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">{groupTitle.length}/50 caracteres</p>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowGroupTitleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (groupTitle.trim()) {
                    setShowGroupTitleModal(false)
                    setShowGroupContactsModal(true)
                    loadUserContacts()
                  }
                }}
                disabled={!groupTitle.trim()}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para seleccionar contactos del grupo */}
      {showGroupContactsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[600px] flex flex-col overflow-hidden">
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Agregar miembros</h2>
                  <p className="text-sm text-gray-600">Grupo: "{groupTitle}"</p>
                </div>
                <button
                  onClick={() => setShowGroupContactsModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {selectedContacts.length > 0 && (
                <p className="text-sm text-orange-600 mt-1">{selectedContacts.length} contacto(s) seleccionado(s)</p>
              )}
            </div>

            {/* Lista de contactos con checkboxes */}
            <div className="overflow-y-auto flex-1 relative">
              {creatingChat && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Creando grupo...</p>
                  </div>
                </div>
              )}
              {loadingContacts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Cargando contactos...</p>
                  </div>
                </div>
              ) : contactsError ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-red-500">Error: {contactsError}</p>
                  <button
                    onClick={loadUserContacts}
                    className="mt-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition"
                  >
                    Reintentar
                  </button>
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500">No tienes contactos disponibles</p>
                </div>
              ) : (
                <div className="p-4">
                  {contacts.map((contact, index) => {
                    const isSelected = selectedContacts.some(sc => sc.id_usuario_contacto === contact.id_usuario_contacto)
                    const initials = ((contact.nombre && contact.apellido) 
                      ? `${contact.nombre[0]}${contact.apellido[0]}` 
                      : contact.nombre?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'CO'
                    ).toUpperCase()
                    return (
                      <div
                        key={contact.id || index}
                        onClick={() => {
                          if (isSelected) {
                            // Deseleccionar contacto
                            setSelectedContacts(selectedContacts.filter(sc => sc.id_usuario_contacto !== contact.id_usuario_contacto))
                          } else {
                            // Seleccionar contacto
                            setSelectedContacts([...selectedContacts, contact])
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition"
                      >
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                          isSelected 
                            ? 'bg-orange-500 border-orange-500' 
                            : 'border-gray-300 hover:border-orange-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Avatar */}
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">{initials}</span>
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{(contact.nombre && contact.apellido) ? `${contact.nombre} ${contact.apellido}` : contact.nombre || 'Sin nombre'}</p>
                          {contact.email && (
                            <p className="text-xs text-gray-500">{contact.email}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer con botones */}
            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGroupContactsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (selectedContacts.length > 0) {
                      try {
                        setCreatingChat(true)
                        await createGroupChat()
                        // El modal se cierra automáticamente en createGroupChat()
                      } catch (error) {
                        console.error('Error al crear grupo:', error)
                        setCustomAlert({
                          show: true,
                          title: 'Error',
                          message: `Error al crear grupo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                          type: 'error'
                        });
                      } finally {
                        setCreatingChat(false)
                      }
                    }
                  }}
                  disabled={selectedContacts.length === 0 || creatingChat}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Crear Grupo ({selectedContacts.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para chat existente */}
      {showExistingChatModal && existingChatData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            {/* Header del modal */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-800">Chat ya existe</h2>
                <button
                  onClick={closeExistingChatModal}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Ya tienes un chat privado con <span className="font-medium">{existingChatData.contact.nombre}</span>
              </p>
            </div>

            {/* Información del chat existente */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {existingChatData.contact.nombre?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'CH'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">{existingChatData.contact.nombre}</p>
                  <p className="text-xs text-gray-500">Chat privado</p>
                </div>
              </div>
              {existingChatData.chat.ultimo_mensaje && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Último mensaje:</p>
                  <p className="text-sm text-gray-700 truncate">{existingChatData.chat.ultimo_mensaje}</p>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={closeExistingChatModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={openExistingChat}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
              >
                Abrir Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Participantes */}
      {showParticipantsModal && selectedChatData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {(() => {
                      const tipoChat = selectedChatData.id_tipo_chat || (selectedChatData as any).tipo_chat
                      return (tipoChat === 2 || tipoChat === '2') ? 'Participantes del Grupo' : 'Información del Chat'
                    })()}
                  </h2>
                  <p className="text-sm text-gray-600">{selectedChatData.nombre}</p>
                </div>
                <button
                  onClick={() => setShowParticipantsModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-orange-600 mt-1">
                {selectedChatData.participantes?.length || 0} participantes
              </p>
            </div>

            {/* Lista de participantes */}
            <div className="overflow-y-auto max-h-[60vh]">
              <div className="p-4 space-y-2">
                {selectedChatData.participantes?.map((participante: any, index: number) => {
                  const nombreCompleto = participante.nombre 
                    ? `${participante.nombre} ${participante.apellido || ''}`
                    : 'Usuario';
                  
                  const initials = nombreCompleto
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div 
                      key={participante.id_usuario_contacto || index}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedUserProfile(participante);
                        setShowUserProfileModal(true);
                      }}
                    >
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{initials}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{nombreCompleto}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alerta Personalizado */}
      {customAlert.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              {/* Icono según el tipo */}
              <div className="flex items-center justify-center mb-4">
                {customAlert.type === 'success' && (
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {customAlert.type === 'error' && (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                {customAlert.type === 'info' && (
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 text-center mb-2">{customAlert.title}</h3>
              <p className="text-gray-600 text-center mb-6">{customAlert.message}</p>
              
              <button
                onClick={() => setCustomAlert({show: false, title: '', message: '', type: 'info'})}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Personalizado */}
      {customConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              {/* Icono de advertencia */}
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 text-center mb-2">{customConfirm.title}</h3>
              <p className="text-gray-600 text-center mb-6">{customConfirm.message}</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setCustomConfirm({show: false, title: '', message: '', onConfirm: () => {}})}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    customConfirm.onConfirm()
                    setCustomConfirm({show: false, title: '', message: '', onConfirm: () => {}})
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil de Usuario */}
      {showUserProfileModal && selectedUserProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUserProfileModal(false)} />
          <div className="relative z-10 w-[90%] max-w-md rounded-2xl bg-white dark:bg-[#111] border border-white/20 shadow-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-orange-600" />
                Perfil del usuario
              </h3>
              <button 
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10" 
                onClick={() => setShowUserProfileModal(false)} 
                aria-label="Cerrar" 
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Información del usuario */}
            <div className="space-y-4 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-xl">
                    {selectedUserProfile.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <h4 className="text-xl font-semibold text-foreground">
                  {fullName(selectedUserProfile.nombre, selectedUserProfile.apellido)}
                </h4>
              </div>

              <div className="bg-white/10 dark:bg-white/5 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nombre:</span>
                  <span className="text-sm text-foreground">
                    {fullName(selectedUserProfile.nombre, selectedUserProfile.apellido)}
                  </span>
                </div>
                
                {selectedUserProfile.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm text-foreground">{selectedUserProfile.email}</span>
                  </div>
                )}
                
                {selectedUserProfile.apodo && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Apodo:</span>
                    <span className="text-sm text-foreground">{selectedUserProfile.apodo}</span>
                  </div>
                )}
              </div>
            </div>

           
          </div>
        </div>
      )}
    </div>
  )
}
