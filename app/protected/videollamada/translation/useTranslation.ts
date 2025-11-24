import { useEffect, useRef, useState } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import {
  fetchSpeechToken,
  createPeerAudioConfig,
  createTranslationRecognizer,
  TranslationQueue,
} from "./translationService";
import type {
  UseTranslationProps,
  TranslationState,
  TranslationTokenData,
} from "./types";

export function useTranslation({
  remoteVideoRef,
  isActive,
  config,
}: UseTranslationProps) {
  // Estado de traducción
  const [state, setState] = useState<TranslationState>({
    isActive: false,
    translationText: "",
    originalText: "",
    finalText: "",
    latency: null,
    error: null,
  });

  // Referencias para Azure Speech SDK
  const recognizerRef = useRef<SpeechSDK.TranslationRecognizer | null>(null);
  const lastTokenRef = useRef<TranslationTokenData | null>(null);

  // Cola de traducciones TTS
  const translationQueueRef = useRef<TranslationQueue | null>(null);

  // Ref para rastrear el último finalText procesado (evitar re-ejecución al cambiar voz)
  const lastProcessedTextRef = useRef<string>("");

  // ⚠️ Ref para la voz actual (evitar closure con valor antiguo en evento recognized)
  const currentVoiceRef = useRef<string>(config.voice);

  // Actualizar ref de voz cuando cambie config.voice
  useEffect(() => {
    currentVoiceRef.current = config.voice;
  }, [config.voice]);

  // ⚠️ Pre-cargar token al montar el componente (optimización para primera traducción)
  useEffect(() => {
    const prefetchToken = async () => {
      try {
        const tokenData = await fetchSpeechToken();
        lastTokenRef.current = tokenData;
        console.log("✓ Translation token prefetched");
      } catch (err) {
        console.warn("Could not prefetch translation token:", err);
      }
    };
    prefetchToken();
  }, []);

  // Inicializar cola de traducciones
  useEffect(() => {
    if (!translationQueueRef.current) {
      translationQueueRef.current = new TranslationQueue();
    }
    return () => {
      if (translationQueueRef.current) {
        translationQueueRef.current.close();
        translationQueueRef.current = null;
      }
    };
  }, []);

  // Efecto principal para manejar la activación/desactivación de traducción
  useEffect(() => {
    if (!isActive) {
      // Limpiar cuando se desactiva
      cleanup();
      setState((prev) => ({
        ...prev,
        isActive: false,
        translationText: "",
        originalText: "",
        finalText: "", // ⚠️ Limpiar finalText para evitar TTS al reactivar
        latency: null,
        error: null,
      }));

      // Limpiar la ref del último texto procesado
      lastProcessedTextRef.current = "";
      return;
    }

    // ⚠️ Limpiar finalText al reiniciar (cambio de idioma) para evitar TTS con texto anterior
    setState((prev) => ({
      ...prev,
      finalText: "",
      translationText: "",
      originalText: "",
    }));

    startTranslation();

    return () => {
      cleanup();
    };
  }, [isActive, config.sourceLang, config.targetLang]);

  // ⚠️ DESHABILITADO: Ahora procesamos TTS directamente en el evento 'recognized' (sin delay de useEffect)
  // Efecto para procesar TTS cuando hay texto final
  // useEffect(() => {
  //   if (!isActive || !state.finalText || state.finalText.startsWith("Error"))
  //     return;
  //   if (state.error) return;

  //   // ⚠️ Solo procesar si es un texto NUEVO (no re-ejecutar al cambiar voz/config)
  //   if (state.finalText === lastProcessedTextRef.current) {
  //     return; // Texto ya procesado, ignorar
  //   }

  //   // Marcar como procesado ANTES de agregar a la cola
  //   lastProcessedTextRef.current = state.finalText;

  //   // Agregar a la cola de traducciones
  //   if (translationQueueRef.current && lastTokenRef.current) {
  //     translationQueueRef.current.add(state.finalText);
  //     translationQueueRef.current.process(config.voice, lastTokenRef.current);
  //   }
  // }, [state.finalText, isActive, config.voice]);

  const startTranslation = async () => {
    let cancelled = false;

    try {
      setState((prev) => ({ ...prev, error: null, isActive: true }));

      // ⚠️ SIEMPRE obtener token fresco (fix para reconocimiento irregular)
      const tokenData = await fetchSpeechToken();
      lastTokenRef.current = tokenData;

      // Crear configuración de audio del peer
      const { audioConfig, cleanup: audioCleanup } =
        createPeerAudioConfig(remoteVideoRef);

      if (!audioConfig) {
        setState((prev) => ({
          ...prev,
          error:
            "No hay audio del peer disponible. Asegúrate de estar en una llamada.",
          isActive: false,
        }));
        return;
      }

      // Crear reconocedor de traducción
      const recognizer = createTranslationRecognizer(
        audioConfig,
        tokenData,
        config.sourceLang,
        config.targetLang
      );

      recognizerRef.current = recognizer;

      // Configurar eventos del reconocedor
      recognizer.recognizing = (s: any, e: any) => {
        if (!cancelled) {
          const startTime = Date.now();
          const translated = e.result.translations.get(config.targetLang) || "";

          setState((prev) => ({
            ...prev,
            translationText: translated,
            latency: Date.now() - startTime,
          }));
        }
      };

      recognizer.recognized = (s: any, e: any) => {
        if (
          !cancelled &&
          e.result.reason === SpeechSDK.ResultReason.TranslatedSpeech
        ) {
          const startTime = Date.now();
          const translated = e.result.translations.get(config.targetLang) || "";
          const original = e.result.text || "";

          console.log(
            `📝 [RECOGNIZED] Original: "${original}" | Traducido: "${translated}"`
          );
          console.log(
            `📝 [RECOGNIZED] Último procesado: "${lastProcessedTextRef.current}"`
          );

          // ⚠️ Procesar TTS INMEDIATAMENTE aquí (sin esperar useEffect)
          if (translated && translated !== lastProcessedTextRef.current) {
            console.log(`✅ [RECOGNIZED] Texto NUEVO, agregando a cola TTS`);
            lastProcessedTextRef.current = translated;

            // Agregar a cola TTS inmediatamente con la voz MÁS RECIENTE
            if (translationQueueRef.current && lastTokenRef.current) {
              translationQueueRef.current.add(translated);
              translationQueueRef.current.process(
                currentVoiceRef.current,
                lastTokenRef.current
              );
            }
          } else if (translated === lastProcessedTextRef.current) {
            console.log(`⏭️ [RECOGNIZED] Texto DUPLICADO, omitiendo TTS`);
          }

          setState((prev) => ({
            ...prev,
            translationText: translated,
            originalText: original,
            finalText: translated,
            latency: Date.now() - startTime,
          }));
        }
      };

      recognizer.canceled = (s: any, e: any) => {
        if (!cancelled) {
          console.warn("Translation canceled:", e.errorDetails);
          setState((prev) => ({
            ...prev,
            error: e.errorDetails || "Traducción cancelada",
            translationText: "",
            originalText: "",
            isActive: false,
          }));
        }
      };

      recognizer.sessionStopped = () => {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            translationText: "",
            originalText: "",
            isActive: false,
          }));
        }
      };

      // ⚠️ Evento cuando la sesión está completamente iniciada y lista
      recognizer.sessionStarted = () => {
        if (!cancelled) {
          console.log("✓ Translation session ready - can start speaking");
        }
      };

      // Iniciar reconocimiento continuo
      await recognizer.startContinuousRecognitionAsync();
      console.log("✓ Translation started - listening to peer audio");
    } catch (err: any) {
      console.error("Translation error:", err);
      setState((prev) => ({
        ...prev,
        error: "Error al iniciar traducción: " + (err?.message || err),
        translationText: "",
        isActive: false,
      }));
    }
  };

  const cleanup = () => {
    // Limpiar recognizer
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync(() => {
        recognizerRef.current?.close();
        recognizerRef.current = null;
      });
    }

    // Limpiar cola de traducciones
    if (translationQueueRef.current) {
      translationQueueRef.current.clear();
    }

    // ⚠️ NO limpiar lastProcessedTextRef aquí - solo al desactivar completamente
    // Esto permite que el cambio de idioma no reproduzca texto anterior

    setState((prev) => ({
      ...prev,
      translationText: "",
      originalText: "",
      finalText: "", // ⚠️ Limpiar finalText para evitar TTS al reactivar
      latency: null,
    }));
  };

  return {
    state,
    isTranslating: state.isActive && isActive,
    hasError: !!state.error,
  };
}
