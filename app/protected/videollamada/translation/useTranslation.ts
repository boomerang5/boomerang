import { useEffect, useRef, useState } from 'react'
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import { 
  fetchSpeechToken, 
  createPeerAudioConfig, 
  createTranslationRecognizer,
  TranslationQueue
} from './translationService'
import type { UseTranslationProps, TranslationState, TranslationTokenData } from './types'

export function useTranslation({ remoteVideoRef, isActive, config }: UseTranslationProps) {
  // Estado de traducción
  const [state, setState] = useState<TranslationState>({
    isActive: false,
    translationText: '',
    originalText: '',
    finalText: '',
    latency: null,
    error: null,
  })

  // Referencias para Azure Speech SDK
  const recognizerRef = useRef<SpeechSDK.TranslationRecognizer | null>(null)
  const lastTokenRef = useRef<TranslationTokenData | null>(null)
  
  // Cola de traducciones TTS
  const translationQueueRef = useRef<TranslationQueue | null>(null)

  // Inicializar cola de traducciones
  useEffect(() => {
    if (!translationQueueRef.current) {
      translationQueueRef.current = new TranslationQueue()
    }
    return () => {
      if (translationQueueRef.current) {
        translationQueueRef.current.close()
        translationQueueRef.current = null
      }
    }
  }, [])

  // Efecto principal para manejar la activación/desactivación de traducción
  useEffect(() => {
    if (!isActive) {
      // Limpiar cuando se desactiva
      cleanup()
      setState(prev => ({
        ...prev,
        isActive: false,
        translationText: '',
        originalText: '',
        latency: null,
        error: null,
      }))

      // Restaurar audio del peer cuando se desactiva la traducción
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = false
      }
      return
    }

    // Silenciar audio del peer cuando se activa la traducción
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = true
    }

    startTranslation()

    return () => {
      cleanup()
    }
  }, [isActive, config.sourceLang, config.targetLang])

  // Efecto para procesar TTS cuando hay texto final
  useEffect(() => {
    if (!isActive || !state.finalText || state.finalText.startsWith('Error')) return
    if (state.error) return

    // Agregar a la cola de traducciones
    if (translationQueueRef.current && lastTokenRef.current) {
      translationQueueRef.current.add(state.finalText)
      translationQueueRef.current.process(config.voice, lastTokenRef.current)
    }
  }, [state.finalText, isActive, config.voice])

  const startTranslation = async () => {
    let cancelled = false
    
    try {
      setState(prev => ({ ...prev, error: null, isActive: true }))
      
      const tokenData = await fetchSpeechToken()
      lastTokenRef.current = tokenData

      // Crear configuración de audio del peer
      const { audioConfig, cleanup: audioCleanup } = createPeerAudioConfig(remoteVideoRef)
      
      if (!audioConfig) {
        setState(prev => ({ 
          ...prev, 
          error: 'No hay audio del peer disponible. Asegúrate de estar en una llamada.',
          isActive: false 
        }))
        return
      }

      // Crear reconocedor de traducción
      const recognizer = createTranslationRecognizer(
        audioConfig, 
        tokenData, 
        config.sourceLang, 
        config.targetLang
      )
      
      recognizerRef.current = recognizer

      // Configurar eventos del reconocedor
      recognizer.recognizing = (s: any, e: any) => {
        if (!cancelled) {
          const startTime = Date.now()
          const translated = e.result.translations.get(config.targetLang) || ''
          
          setState(prev => ({
            ...prev,
            translationText: translated,
            latency: Date.now() - startTime
          }))

          console.log('🔄 [RECONOCIMIENTO] Reconociendo continuamente...', { 
            translated: translated.substring(0, 50) 
          })
        }
      }

      recognizer.recognized = (s: any, e: any) => {
        if (!cancelled && e.result.reason === SpeechSDK.ResultReason.TranslatedSpeech) {
          const startTime = Date.now()
          const translated = e.result.translations.get(config.targetLang) || ''
          const original = e.result.text || ''

          console.log('✅ [RECONOCIMIENTO] Reconocido (no bloqueante):', {
            original: original.substring(0, 50),
            translated: translated.substring(0, 50)
          })

          setState(prev => ({
            ...prev,
            translationText: translated,
            originalText: original,
            finalText: translated,
            latency: Date.now() - startTime
          }))
        }
      }

      recognizer.canceled = (s: any, e: any) => {
        if (!cancelled) {
          console.warn('Translation canceled:', e.errorDetails)
          setState(prev => ({
            ...prev,
            error: e.errorDetails || 'Traducción cancelada',
            translationText: '',
            originalText: '',
            isActive: false
          }))
        }
      }

      recognizer.sessionStopped = () => {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            translationText: '',
            originalText: '',
            isActive: false
          }))
        }
      }

      // Iniciar reconocimiento continuo
      await recognizer.startContinuousRecognitionAsync()
      console.log('✓ Translation started - listening to peer audio')

    } catch (err: any) {
      console.error('Translation error:', err)
      setState(prev => ({
        ...prev,
        error: 'Error al iniciar traducción: ' + (err?.message || err),
        translationText: '',
        isActive: false
      }))
    }
  }

  const cleanup = () => {
    // Limpiar recognizer
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync(() => {
        recognizerRef.current?.close()
        recognizerRef.current = null
      })
    }

    // Limpiar cola de traducciones
    if (translationQueueRef.current) {
      translationQueueRef.current.clear()
    }

    setState(prev => ({
      ...prev,
      translationText: '',
      originalText: '',
      latency: null,
    }))
  }

  return {
    state,
    isTranslating: state.isActive && isActive,
    hasError: !!state.error,
  }
}