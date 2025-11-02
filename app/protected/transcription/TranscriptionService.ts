import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'

export type TranscriptEntry = {
  id: string
  timestamp: number
  userId: string
  userName: string
  text: string
}

// Función simple para generar IDs únicos
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

interface TranscriptionCallbacks {
  onLocalTranscription: (entry: TranscriptEntry) => void
  onError: (error: string) => void
}

export class TranscriptionService {
  private localRecognizer: SpeechSDK.SpeechRecognizer | null = null
  private callbacks: TranscriptionCallbacks
  private localSpeakerName: string
  private localUserId: string

  constructor(
    localSpeakerName: string,
    localUserId: string,
    callbacks: TranscriptionCallbacks
  ) {
    this.localSpeakerName = localSpeakerName
    this.localUserId = localUserId
    this.callbacks = callbacks
  }

  /**
   * Inicia la transcripción del micrófono local
   */
  async startLocalTranscription(): Promise<void> {
    if (this.localRecognizer) {
      return
    }

    try {
      // Obtener token de Azure
      const response = await fetch('/api/token')
      if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.status}`)
      }
      const { token, region } = await response.json()

      // Configurar Speech Recognition para micrófono local
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region)
      speechConfig.speechRecognitionLanguage = 'es-ES'
      
      // Verificar permisos de micrófono primero
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop()) // Liberar inmediatamente
      } catch (micError) {
        throw new Error(`Sin permisos de micrófono: ${micError}`)
      }

      // Usar micrófono por defecto
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
      
      this.localRecognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig)
      
      // Event handlers para transcripción local
      this.localRecognizer.recognized = (s, e) => {
        if (e.result && e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const text = e.result.text?.trim()
          if (text && text.length > 0) {
            const entry: TranscriptEntry = {
              id: generateId(),
              timestamp: Date.now(),
              userId: this.localUserId,
              userName: this.localSpeakerName,
              text: text
            }
            this.callbacks.onLocalTranscription(entry)
          }
        }
      }

      this.localRecognizer.canceled = (s, e) => {
        this.callbacks.onError(`Transcripción local cancelada: ${e.errorDetails}`)
      }

      this.localRecognizer.sessionStarted = () => {
        // Sesión iniciada - solo mostrar una vez
      }

      this.localRecognizer.sessionStopped = () => {
        // Sesión detenida
      }

      // Iniciar reconocimiento continuo
      await new Promise<void>((resolve, reject) => {
        this.localRecognizer!.startContinuousRecognitionAsync(
          () => {
            console.log('✅ Transcripción iniciada correctamente')
            resolve()
          },
          (error) => {
            reject(new Error(error))
          }
        )
      })

    } catch (error) {
      this.callbacks.onError(`Error: ${error}`)
    }
  }



  /**
   * Detiene la transcripción local
   */
  async stopTranscription(): Promise<void> {
    if (this.localRecognizer) {
      await new Promise<void>((resolve) => {
        this.localRecognizer!.stopContinuousRecognitionAsync(() => {
          this.localRecognizer?.close()
          this.localRecognizer = null
          resolve()
        })
      })
    }
  }

  /**
   * Actualiza el nombre del speaker local
   */
  updateSpeakerName(localName: string): void {
    this.localSpeakerName = localName
  }
}