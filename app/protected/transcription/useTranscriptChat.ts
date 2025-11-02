import { useEffect, useRef, useState } from 'react'
import { TranscriptionService, type TranscriptEntry } from './TranscriptionService'

interface UseTranscriptChatProps {
  isActive: boolean
  localUserId: string
  localUserName: string
  callChannel: any // RealtimeChannel de Supabase
}

export const useTranscriptChat = ({
  isActive,
  localUserId,
  localUserName,
  callChannel
}: UseTranscriptChatProps) => {
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null)

  // Función para agregar nueva entrada al chat (local o remota)
  const addTranscriptEntry = (entry: TranscriptEntry, shouldLog = false) => {
    setTranscriptEntries(prev => {
      // Evitar duplicados por ID
      if (prev.some(e => e.id === entry.id)) {
        return prev
      }
      
      // Agregar y ordenar por timestamp
      const newEntries = [...prev, entry].sort((a, b) => a.timestamp - b.timestamp)
      
      // Solo mostrar en consola cuando se especifica
      if (shouldLog) {
        console.log(`${entry.userName}: ${entry.text}`)
      }
      
      return newEntries
    })
  }

  // Función para recibir entrada remota (se expone para que la página la use)
  const handleRemoteTranscript = (entry: TranscriptEntry) => {
    addTranscriptEntry(entry)
  }

  useEffect(() => {
    if (isActive && !transcriptionServiceRef.current) {
      // Crear servicio con callbacks actualizados
      transcriptionServiceRef.current = new TranscriptionService(
        localUserName,
        localUserId,
        {
          onLocalTranscription: (entry: TranscriptEntry) => {
            // Agregar a nuestro chat local y mostrar en consola (solo el que habla loguea)
            addTranscriptEntry(entry, true)
            // Enviar al peer via realtime
            if (callChannel) {
              try {
                callChannel.send({ type: 'broadcast', event: 'transcript', payload: entry })
              } catch (error) {
                console.error('Error enviando transcripción:', error)
              }
            }
          },
          onError: (errorMessage: string) => {
            setError(errorMessage)
            setIsTranscribing(false)
          }
        }
      )

      // Iniciar transcripción
      const startTranscription = async () => {
        setIsTranscribing(true)
        setError(null)
        
        try {
          await transcriptionServiceRef.current?.startLocalTranscription()
        } catch (err) {
          setError(`Error: ${err}`)
          setIsTranscribing(false)
        }
      }

      startTranscription()
    }

    // Cleanup cuando se desactiva
    if (!isActive && transcriptionServiceRef.current) {
      transcriptionServiceRef.current.stopTranscription().then(() => {
        transcriptionServiceRef.current = null
        setIsTranscribing(false)
        setError(null)
      })
    }

  }, [isActive, localUserId, localUserName, callChannel])

  // Listener para transcripciones remotas
  useEffect(() => {
    if (!callChannel) return

    const handler = ({ payload }: any) => {
      try {
        const entry = payload as TranscriptEntry
        if (entry && entry.id && entry.text && entry.userName !== localUserName) {
          // Solo procesar transcripciones de otros usuarios (filtrar por nombre)
          addTranscriptEntry(entry, true)
        }
      } catch (e) {
        console.warn('Error procesando transcripción remota:', e)
      }
    }

    try {
      callChannel.on('broadcast', { event: 'transcript' }, handler)
    } catch (e) {
      console.warn('Error configurando listener:', e)
    }

    return () => {
      try {
        callChannel.off('broadcast', { event: 'transcript' }, handler)
      } catch (e) { /* ignore */ }
    }
  }, [callChannel, localUserName])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (transcriptionServiceRef.current) {
        transcriptionServiceRef.current.stopTranscription()
        transcriptionServiceRef.current = null
      }
    }
  }, [])

  return {
    transcriptEntries,
    isTranscribing,
    error
  }
}