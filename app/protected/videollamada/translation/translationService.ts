import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import type {
  TranslationTokenData,
  TargetLanguageOption,
  LanguageOption,
} from "./types";

// Utilidad para obtener el token de Azure Speech Translation
export async function fetchSpeechToken(): Promise<TranslationTokenData> {
  const res = await fetch("/api/token");
  if (!res.ok) throw new Error("No se pudo obtener el token de traducción");
  return await res.json(); // { token, region }
}

// Opciones de idiomas de origen
export const SOURCE_LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "es-ES", label: "Español" },
  { value: "en-US", label: "Inglés" },
  { value: "pt-BR", label: "Portugués" },
  { value: "fr-FR", label: "Francés" },
  { value: "it-IT", label: "Italiano" },
  { value: "de-DE", label: "Alemán" },
];

// Opciones de idiomas de destino con voces
export const TARGET_LANGUAGE_OPTIONS: TargetLanguageOption[] = [
  {
    value: "en",
    label: "Inglés",
    voices: [
      { value: "en-US-AriaNeural", label: "Femenina (Inglés)" },
      { value: "en-US-GuyNeural", label: "Masculina (Inglés)" },
    ],
  },
  {
    value: "pt",
    label: "Portugués",
    voices: [
      { value: "pt-BR-FranciscaNeural", label: "Femenina (Portugués)" },
      { value: "pt-BR-AntonioNeural", label: "Masculina (Portugués)" },
    ],
  },
  {
    value: "fr",
    label: "Francés",
    voices: [
      { value: "fr-FR-DeniseNeural", label: "Femenina (Francés)" },
      { value: "fr-FR-HenriNeural", label: "Masculina (Francés)" },
    ],
  },
  {
    value: "it",
    label: "Italiano",
    voices: [
      { value: "it-IT-ElsaNeural", label: "Femenina (Italiano)" },
      { value: "it-IT-DiegoNeural", label: "Masculina (Italiano)" },
    ],
  },
  {
    value: "es",
    label: "Español",
    voices: [
      { value: "es-ES-ElviraNeural", label: "Femenina (Español)" },
      { value: "es-ES-AlvaroNeural", label: "Masculina (Español)" },
    ],
  },
];

// Configuración predeterminada para traducción
export const DEFAULT_TRANSLATION_CONFIG = {
  sourceLang: "es-ES",
  targetLang: "en",
  voice: TARGET_LANGUAGE_OPTIONS[0].voices[1].value, // ⚠️ Masculina por defecto (índice 1)
  autoDetectLang: false,
  showOriginalText: true,
};

// Clase para manejar la cola de traducciones TTS
export class TranslationQueue {
  private queue: string[] = [];
  private isPlaying = false;
  private audioContext: AudioContext | null = null;

  constructor() {
    // Inicializar AudioContext cuando sea necesario
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  public add(text: string): void {
    // Evitar duplicados: no agregar si el texto ya está en la cola
    if (this.queue.includes(text)) {
      console.log(
        `⏭️ [TTS] Texto ya en cola, omitiendo: "${text.substring(0, 30)}..."`
      );
      return;
    }
    this.queue.push(text);
    console.log(
      `➕ [TTS] Agregado a cola (total: ${this.queue.length}): "${text.substring(0, 30)}..."`
    );
  }

  public async process(
    voice: string,
    tokenData: TranslationTokenData
  ): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    if (this.isPlaying) {
      console.log(
        `🔇 [TTS] Ya reproduciendo, esperando... (${this.queue.length} en cola)`
      );
      return;
    }

    this.isPlaying = true;
    const textToPlay = this.queue.shift();

    if (!textToPlay) {
      this.isPlaying = false;
      return;
    }

    console.log(
      `🔊 [TTS] Reproduciendo (${this.queue.length} restantes): "${textToPlay}"`
    );

    try {
      await this.synthesizeAndPlay(textToPlay, voice, tokenData);
      console.log(`✅ [TTS] Reproducción completada`);
    } catch (error) {
      console.error("❌ [TTS] Error procesando TTS:", error);
    } finally {
      this.isPlaying = false;
      // Procesar siguiente elemento en la cola
      if (this.queue.length > 0) {
        console.log(`🔄 [TTS] Procesando siguiente en cola...`);
        this.process(voice, tokenData);
      }
    }
  }

  private async synthesizeAndPlay(
    text: string,
    voice: string,
    tokenData: TranslationTokenData
  ): Promise<void> {
    console.log(
      `🎤 [SYNTHESIZE] Iniciando síntesis para: "${text.substring(0, 50)}..."`
    );

    return new Promise((resolve, reject) => {
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
        tokenData.token,
        tokenData.region
      );
      speechConfig.speechSynthesisVoiceName = voice;

      // ⚠️ CRÍTICO: Usar AudioConfig NULL para evitar reproducción automática del SDK
      const synthesizer = new SpeechSDK.SpeechSynthesizer(
        speechConfig,
        null as any
      );

      // ⚠️ Usar speakTextAsync con el synthesizer configurado sin AudioConfig
      // Esto evita que el SDK reproduzca automáticamente el audio
      synthesizer.speakTextAsync(
        text,
        async (result: SpeechSDK.SpeechSynthesisResult) => {
          try {
            synthesizer.close();
            console.log(
              `🎤 [SYNTHESIZE] Síntesis completada, procesando audio...`
            );

            if (
              result.reason !==
              SpeechSDK.ResultReason.SynthesizingAudioCompleted
            ) {
              console.error(
                "❌ [TTS] Síntesis falló:",
                (result as any).errorDetails
              );
              reject(
                new Error(
                  "Error en síntesis de voz: " +
                    ((result as any).errorDetails || "Desconocido")
                )
              );
              return;
            }

            const audioData = (result as any).audioData;
            if (!audioData) {
              console.log(`⚠️ [SYNTHESIZE] Sin datos de audio`);
              resolve();
              return;
            }

            const arrayBuf =
              audioData instanceof ArrayBuffer
                ? audioData
                : new Uint8Array(audioData).buffer;

            // Decodificar el audio
            let audioBuffer: AudioBuffer | null = null;
            const audioCtx = this.getAudioContext();
            console.log(`🔊 [AUDIO] AudioContext state: ${audioCtx.state}`);

            try {
              audioBuffer = await audioCtx.decodeAudioData(
                arrayBuf.slice(0) as ArrayBuffer
              );
              console.log(
                `✅ [AUDIO] Audio decodificado: ${audioBuffer.duration.toFixed(2)}s`
              );
            } catch {
              // Fallback a callback API
              audioBuffer = await new Promise<AudioBuffer>((res, rej) => {
                audioCtx.decodeAudioData(
                  arrayBuf.slice(0) as ArrayBuffer,
                  res,
                  rej
                );
              });
              console.log(
                `✅ [AUDIO] Audio decodificado (fallback): ${audioBuffer.duration.toFixed(2)}s`
              );
            }

            if (!audioBuffer) {
              resolve();
              return;
            }

            // Asegurar que el AudioContext no esté suspendido
            if (audioCtx.state === "suspended") {
              await audioCtx.resume();
              console.log(`▶️ [AUDIO] AudioContext resumed`);
            }

            // Crear fuente de audio
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;

            // Crear GainNode para control de volumen
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.0;

            // Conectar: source → gainNode → destination
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            console.log(`🎵 [AUDIO] Iniciando reproducción (SOLO UNA VEZ)...`);

            // Asegurar que onended solo se ejecute una vez
            let hasEnded = false;
            let hasStarted = false;

            source.onended = () => {
              if (!hasEnded) {
                hasEnded = true;
                console.log(`🛑 [AUDIO] Reproducción finalizada`);
                try {
                  source.disconnect();
                  gainNode.disconnect();
                } catch (e) {
                  // Ignorar errores de desconexión
                }
                resolve();
              }
            };

            // Reproducir UNA SOLA VEZ
            if (!hasStarted) {
              hasStarted = true;
              source.start(0);
              console.log(
                `▶️ [AUDIO] source.start(0) ejecutado - Reproduciendo por AudioContext`
              );
            }
          } catch (err) {
            console.error("❌ [SYNTHESIZE] Error en handler", err);
            reject(
              new Error("Error procesando audio TTS: " + (err as Error).message)
            );
          }
        },
        (error: string) => {
          console.error("❌ [SYNTHESIZE] TTS error:", error);
          try {
            synthesizer.close();
          } catch {}
          reject(new Error("Error en TTS: " + error));
        }
      );
    });
  }

  public clear(): void {
    this.queue = [];
    this.isPlaying = false;
    console.log("🧹 [COLA] Cola limpiada");
  }

  public close(): void {
    this.clear();
    if (this.audioContext) {
      try {
        this.audioContext.close();
        this.audioContext = null;
      } catch (e) {
        console.warn("Error cerrando AudioContext:", e);
      }
    }
  }
}

// Función para configurar el reconocedor de traducción
export function createTranslationRecognizer(
  audioConfig: SpeechSDK.AudioConfig,
  tokenData: TranslationTokenData,
  sourceLang: string,
  targetLang: string
): SpeechSDK.TranslationRecognizer {
  const stConfig = SpeechSDK.SpeechTranslationConfig.fromAuthorizationToken(
    tokenData.token,
    tokenData.region
  );

  // Configurar idioma fuente
  if (sourceLang === "auto") {
    try {
      stConfig.setProperty(
        SpeechSDK.PropertyId.SpeechServiceConnection_AutoDetectSourceLanguages,
        JSON.stringify({
          mode: "Single",
        })
      );
      stConfig.addTargetLanguage(targetLang);
    } catch (e) {
      console.warn("Auto-detect not supported, falling back to es-ES");
      stConfig.speechRecognitionLanguage = "es-ES";
      stConfig.addTargetLanguage(targetLang);
    }
  } else {
    stConfig.speechRecognitionLanguage = sourceLang;
    stConfig.addTargetLanguage(targetLang);
  }

  // Configuraciones adicionales
  try {
    stConfig.setProperty(
      SpeechSDK.PropertyId.SpeechServiceResponse_PostProcessingOption,
      "TrueText"
    );
  } catch (e) {}

  try {
    stConfig.setProperty(
      SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs,
      String(800)
    );
  } catch (e) {}

  try {
    stConfig.setProfanity(SpeechSDK.ProfanityOption.Raw);
  } catch (e) {}

  const recognizer = new SpeechSDK.TranslationRecognizer(stConfig, audioConfig);

  // Phrase list para nombres/tecnicismos
  try {
    const pl = SpeechSDK.PhraseListGrammar.fromRecognizer(recognizer);
    ["Boomerang", "Supabase", "WebRTC", "Azure", "Aria", "Vercel"].forEach(
      (p) => pl.addPhrase(p)
    );
  } catch (e) {}

  return recognizer;
}

// Función para crear configuración de audio desde stream del peer
export function createPeerAudioConfig(
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>
): {
  audioConfig: SpeechSDK.AudioConfig | null;
  cleanup: () => void;
} {
  const remoteVideo = remoteVideoRef.current;
  if (!remoteVideo || !remoteVideo.srcObject) {
    console.warn("No hay audio del peer disponible");
    return { audioConfig: null, cleanup: () => {} };
  }

  const remoteStream = remoteVideo.srcObject as MediaStream;
  const remoteAudioTrack = remoteStream.getAudioTracks()[0];

  if (!remoteAudioTrack) {
    console.warn("El peer no está enviando audio");
    return { audioConfig: null, cleanup: () => {} };
  }

  // Crear AudioContext para capturar SOLO el audio del peer
  const remoteAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();

  // Crear un stream que contenga SOLO el audio del peer
  const peerOnlyStream = new MediaStream([remoteAudioTrack]);
  const remoteAudioSource =
    remoteAudioContext.createMediaStreamSource(peerOnlyStream);
  const remoteAudioDestination =
    remoteAudioContext.createMediaStreamDestination();

  // Conectar SOLO el audio del peer al destino
  remoteAudioSource.connect(remoteAudioDestination);

  // Crear audioConfig usando SOLO el audio del peer
  const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(
    remoteAudioDestination.stream
  );

  const cleanup = () => {
    try {
      if (remoteAudioSource) remoteAudioSource.disconnect();
      if (remoteAudioDestination) {
        remoteAudioDestination.stream.getTracks().forEach((t) => t.stop());
      }
      if (remoteAudioContext) remoteAudioContext.close();
    } catch (e) {
      console.warn("Error cleaning up remote audio:", e);
    }
  };

  return { audioConfig, cleanup };
}
