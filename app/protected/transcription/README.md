# 🎤 Funcionalidad de Transcripción en Videollamadas

## Descripción

Sistema modular de transcripción que captura y convierte a texto el audio de ambos participantes en videollamadas usando Azure Speech-to-Text.

## Arquitectura

### 📁 Estructura de archivos:

```
app/protected/transcription/
├── TranscriptionService.ts    # Servicio principal de STT
└── useTranscription.ts        # Hook React para manejo de estado
```

### 🔧 Componentes:

#### **TranscriptionService.ts**

- Maneja Azure Speech SDK para STT
- Captura audio local (micrófono del usuario)
- Captura audio remoto (stream del peer)
- Gestiona reconocedores independientes para cada fuente

#### **useTranscription.ts**

- Hook React que coordina el servicio
- Maneja estado de la transcripción (activo/inactivo, errores)
- Se integra con el ciclo de vida del componente

## 🎮 Uso

### Activación:

1. **Durante una videollamada:** Hacer clic en el botón "Transcript"
2. **Por URL:** Añadir `?transcript=1` a la URL de videollamada
3. **Por sessionStorage:** Se activa automáticamente si hay configuración previa

### Logs en consola:

Cuando la transcripción está activa, verás en la consola del navegador:

```
🎤 [Hook] Iniciando servicio de transcripción...
▶️ [Transcription Local] Sesión iniciada
▶️ [Transcription Remote] Sesión iniciada
✅ [Hook] Transcripciones iniciadas

// Durante la conversación:
Diego: Hola, ¿cómo estás?
FFFran: Muy bien, gracias por preguntar
Diego: Me alegro de escuchar eso
```

### Indicadores visuales:

- **Botón azul con "ON"**: Transcripción activa
- **Icono pulsante**: Procesando audio
- **⚠️**: Error en la transcripción

## 🔧 Configuración técnica

### Parámetros del hook:

```typescript
const { isTranscribing, error } = useTranscription({
  isActive: callTranscriptActive, // Estado ON/OFF
  localSpeakerName: meName || "Yo", // Nombre del usuario local
  remoteSpeakerName: peerName || "Invitado", // Nombre del peer
  remoteVideoRef, // Referencia al video remoto
});
```

### Dependencias:

- Azure Speech SDK (`microsoft-cognitiveservices-speech-sdk`)
- API `/api/token` para obtener tokens de Azure
- WebRTC MediaStreams para captura de audio

## 🎯 Características

✅ **Transcripción dual**: Usuario local y remoto simultáneamente  
✅ **Logs simples**: Formato "Nombre: texto" en consola  
✅ **Integración mínima**: No extiende significativamente el archivo principal  
✅ **Manejo de errores**: Indicadores visuales y logs de error  
✅ **Limpieza automática**: Se detiene al desactivar o salir de la llamada

## 📝 Notas de desarrollo

- **Lenguaje**: Configurado para español (`es-ES`)
- **Calidad**: Reconocimiento continuo con Azure Speech SDK
- **Performance**: Reconocedores independientes evitan conflictos
- **Memoria**: Limpieza automática al desmontar componentes

## 🚀 Próximas mejoras potenciales

- [ ] Guardar transcripciones en Supabase Storage
- [ ] Configuración de idioma dinámico
- [ ] Exportar transcripciones como archivo
- [ ] Interfaz visual de transcripción en tiempo real
