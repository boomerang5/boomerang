'use client'

import clsx from 'clsx'
import { SOURCE_LANGUAGE_OPTIONS, TARGET_LANGUAGE_OPTIONS } from './translationService'
import type { TranslationButtonProps } from './types'

export function TranslationOverlay({
    isActive,
    config,
    onConfigChange,
    state
}: Omit<TranslationButtonProps, 'onToggle'>) {
    const handleSourceLangChange = (sourceLang: string) => {
        onConfigChange({ sourceLang })
    }

    const handleTargetLangChange = (targetLang: string) => {
        onConfigChange({ targetLang })
        // Actualizar voz automáticamente cuando cambia idioma
        const lang = TARGET_LANGUAGE_OPTIONS.find(l => l.value === targetLang)
        if (lang) {
            onConfigChange({ targetLang, voice: lang.voices[0].value })
        }
    }

    const handleVoiceChange = (voice: string) => {
        onConfigChange({ voice })
    }

    const handleShowOriginalChange = (showOriginalText: boolean) => {
        onConfigChange({ showOriginalText })
    }

    return (
        <>
            {/* Overlay de traducción en tiempo real */}
            {isActive && (
                <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-white/95 dark:bg-black/90 px-6 py-4 shadow-2xl border border-orange-400/40 max-w-3xl w-[95vw] text-center">
                    {/* Mensaje de error */}
                    {state.error && (
                        <div className="mb-3 p-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 text-sm">
                            ⚠️ {state.error}
                        </div>
                    )}

                    {/* Indicador de estado */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                        </span>
                        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                            {state.translationText ? 'Traduciendo...' : 'Escuchando audio del peer...'}
                        </span>
                        {state.latency && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({state.latency}ms)
                            </span>
                        )}
                    </div>

                    {/* Texto original */}
                    {config.showOriginalText && state.originalText && (
                        <div className="mb-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original:</div>
                            <div className="text-base text-gray-700 dark:text-gray-300 italic">{state.originalText}</div>
                        </div>
                    )}

                    {/* Texto traducido */}
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700">
                        <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Traducción:</div>
                        <div className="text-lg font-semibold text-orange-700 dark:text-orange-200">
                            {state.translationText || 'Esperando...'}
                        </div>
                    </div>

                    {/* Controles de configuración */}
                    <div className="mt-4 pt-3 border-t border-gray-300 dark:border-gray-600">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {/* Idioma origen */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-600 dark:text-gray-400">Idioma origen:</label>
                                <select
                                    className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                                    value={config.sourceLang}
                                    onChange={e => handleSourceLangChange(e.target.value)}
                                >
                                    {SOURCE_LANGUAGE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Idioma destino */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-600 dark:text-gray-400">Idioma destino:</label>
                                <select
                                    className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                                    value={config.targetLang}
                                    onChange={e => handleTargetLangChange(e.target.value)}
                                >
                                    {TARGET_LANGUAGE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Voz */}
                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className="text-xs text-gray-600 dark:text-gray-400">Voz TTS:</label>
                                <select
                                    className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                                    value={config.voice}
                                    onChange={e => handleVoiceChange(e.target.value)}
                                >
                                    {(TARGET_LANGUAGE_OPTIONS.find(l => l.value === config.targetLang)?.voices || []).map(v => (
                                        <option key={v.value} value={v.value}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Toggles adicionales */}
                        <div className="mt-3 flex items-center justify-center gap-4 text-xs">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.showOriginalText}
                                    onChange={e => handleShowOriginalChange(e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-gray-600 dark:text-gray-400">Mostrar original</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}