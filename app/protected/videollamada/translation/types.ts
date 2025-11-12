export interface VoiceOption {
  value: string
  label: string
}

export interface LanguageOption {
  value: string
  label: string
  voices?: VoiceOption[]
}

export interface TargetLanguageOption extends LanguageOption {
  voices: VoiceOption[]
}

export interface TranslationConfig {
  sourceLang: string
  targetLang: string
  voice: string
  autoDetectLang: boolean
  showOriginalText: boolean
}

export interface TranslationState {
  isActive: boolean
  translationText: string
  originalText: string
  finalText: string
  latency: number | null
  error: string | null
}

export interface TranslationTokenData {
  token: string
  region: string
}

export interface TranslationQueueItem {
  text: string
  voice: string
  tokenData: TranslationTokenData
}

export interface UseTranslationProps {
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>
  isActive: boolean
  config: TranslationConfig
}

export interface TranslationButtonProps {
  isActive: boolean
  onToggle: () => void
  config: TranslationConfig
  onConfigChange: (config: Partial<TranslationConfig>) => void
  state: TranslationState
}