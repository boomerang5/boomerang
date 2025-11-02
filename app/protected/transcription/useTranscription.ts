import { useEffect, useRef, useState } from 'react'
import { TranscriptionService } from './TranscriptionService'

interface UseTranscriptionProps {
  isActive: boolean
  localSpeakerName: string
}

export const useTranscription = ({
  isActive,
  localSpeakerName
}: UseTranscriptionProps) => {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null)
  
  // Identificador único para esta instancia
  const instanceId = `[${localSpeakerName}]`

  console.log(`🎤 ${instanceId} Hook inicializado:`, {
    isActive,
    localSpeakerName
  })

  useEffect(() => {
    console.log(`🎤 ${instanceId} useEffect ejecutado:`, { isActive, hasService: !!transcriptionServiceRef.current })
    
    if (isActive && !transcriptionServiceRef.current) {
      console.log(`🎤 ${instanceId} Iniciando servicio de transcripción...`, { localSpeakerName })
      
      // Crear el servicio de transcripción con callbacks
      transcriptionServiceRef.current = new TranscriptionService(
        localSpeakerName,
        'temp-user-id', // userId temporal para compatibilidad
        {
          onLocalTranscription: (entry) => {
            // Log simple en consola - solo transcripción local
            console.log(`${entry.userName}: ${entry.text}`)
          },
          onError: (errorMessage: string) => {
            console.error(`❌ ${instanceId} Error:`, errorMessage)
            setError(errorMessage)
            setIsTranscribing(false)
          }
        }
      )

      // Iniciar solo transcripción local (STT del micrófono)
      const startLocalTranscription = async () => {
        setIsTranscribing(true)
        setError(null)
        
        try {
          console.log(`🎤 ${instanceId} Iniciando transcripción local...`)
          await transcriptionServiceRef.current?.startLocalTranscription()
          console.log(`✅ ${instanceId} Transcripción local iniciada exitosamente`)
        } catch (err) {
          console.error(`❌ ${instanceId} Error iniciando transcripción:`, err)
          setError(`Error: ${err}`)
          setIsTranscribing(false)
        }
      }

      startLocalTranscription()
    }

    // Cleanup cuando se desactiva
    if (!isActive && transcriptionServiceRef.current) {
      console.log(`🛑 ${instanceId} Deteniendo transcripción...`)
      
      transcriptionServiceRef.current.stopTranscription().then(() => {
        transcriptionServiceRef.current = null
        setIsTranscribing(false)
        setError(null)
        console.log(`✅ ${instanceId} Transcripción detenida`)
      })
    }

    // Actualizar nombre del speaker si cambia
    if (transcriptionServiceRef.current) {
      transcriptionServiceRef.current.updateSpeakerName(localSpeakerName)
    }

  }, [isActive, localSpeakerName])

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (transcriptionServiceRef.current) {
        console.log(`🧹 ${instanceId} Cleanup al desmontar`)
        transcriptionServiceRef.current.stopTranscription()
        transcriptionServiceRef.current = null
      }
    }
  }, [])

  return {
    isTranscribing,
    error
  }
}