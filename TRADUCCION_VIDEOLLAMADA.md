# Sistema de Traducción en Tiempo Real - Videollamada

## 🎯 Problema Resuelto

**Problema anterior:** La traducción solo escuchaba el micrófono local (de quien activaba la traducción), no el audio del peer (la otra persona hablando).

**Solución implementada:** Ahora la traducción captura el audio del **peer** (la otra persona en la videollamada) y lo traduce en tiempo real.

## 🔧 Cómo Funciona

### Flujo de Traducción

```
Audio del Peer (Remote) → AudioContext → Speech Recognition → Translation → Display + TTS → WebRTC → Peer
```

1. **Captura de Audio del Peer:**
   - Se captura el stream de audio del `remoteVideoRef` (la otra persona)
   - Se crea un `AudioContext` para procesar el audio
   - Se conecta el audio del peer a un `MediaStreamDestination`

2. **Reconocimiento y Traducción:**
   - Azure Speech SDK reconoce el audio del peer
   - Traduce de idioma origen → idioma destino
   - Soporta detección automática de idioma

3. **Síntesis de Voz (TTS):**
   - Convierte el texto traducido a audio
   - Envía el audio traducido de vuelta al peer vía WebRTC
   - Reemplaza temporalmente el micrófono local con el audio TTS

4. **Visualización:**
   - Muestra el texto original (del peer)
   - Muestra el texto traducido
   - Indica latencia en tiempo real
   - Muestra errores si ocurren

## ✨ Nuevas Características

### 1. **Traducción del Audio del Peer**
- ✅ Ahora escucha y traduce el audio de la otra persona
- ✅ No solo tu propio micrófono

### 2. **Detección Automática de Idioma**
- ✅ Opción para detectar automáticamente el idioma del peer
- ✅ Soporta: Español, Inglés, Portugués, Francés, Italiano, Alemán

### 3. **Texto Original + Traducido**
- ✅ Muestra el texto original que captó del peer
- ✅ Muestra la traducción simultáneamente
- ✅ Toggle para mostrar/ocultar el texto original

### 4. **Indicador de Latencia**
- ✅ Muestra el tiempo de procesamiento (ms)
- ✅ Ayuda a entender el delay de la traducción

### 5. **Gestión de Errores Mejorada**
- ✅ Mensajes de error claros y visibles
- ✅ Feedback cuando no hay audio del peer
- ✅ Indicadores visuales de problemas

### 6. **Configuración Avanzada**
- ✅ Selector de idioma origen (con auto-detección)
- ✅ Selector de idioma destino
- ✅ Selector de voz TTS (femenina/masculina)
- ✅ Toggle para mostrar texto original
- ✅ Toggle para subtítulos

### 7. **UI Mejorada**
- ✅ Panel de traducción más grande y completo
- ✅ Indicador animado de estado (pulsante)
- ✅ Mensajes de error en rojo
- ✅ Botón de traducción con animación cuando está activo
- ✅ Diseño responsive

## 🎨 Interfaz de Usuario

### Panel de Traducción (cuando está activo)

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ [Mensaje de error si hay]                      │
│                                                      │
│  🔴 Traduciendo... (150ms)                          │
│                                                      │
│  Original:                                          │
│  "Hello, how are you?"                              │
│                                                      │
│  Traducción:                                        │
│  "Hola, ¿cómo estás?"                              │
│                                                      │
│  ───────────────────────────────────────────        │
│  Idioma origen: [Español ▼]  Idioma destino: [En ▼]│
│  Voz TTS: [Femenina (Inglés) ▼]                     │
│                                                      │
│  ☑️ Mostrar original  ☑️ Subtítulos                 │
└─────────────────────────────────────────────────────┘
```

### Botón de Traducción
- **Inactivo:** Naranja con hover
- **Activo:** Naranja brillante con ring y pulso
- **Con error:** Muestra ⚠️

## 🔑 Configuración Requerida

### Variables de Entorno

Asegúrate de tener estas variables en tu `.env.local`:

```env
SPEECH_KEY=tu_azure_speech_key
SPEECH_REGION=tu_azure_region
```

### Dependencias

```json
{
  "microsoft-cognitiveservices-speech-sdk": "^1.x.x"
}
```

## 📝 Uso

1. **Iniciar una videollamada:**
   - Abre la página de videollamada
   - Conecta con otra persona

2. **Activar traducción:**
   - Haz clic en el botón "Traducción" en la barra de controles
   - El panel de traducción aparecerá en la parte superior

3. **Configurar idiomas:**
   - Selecciona el idioma origen (o usa "Detección automática")
   - Selecciona el idioma destino
   - Elige la voz TTS

4. **Ver traducción:**
   - Cuando la otra persona hable, verás:
     - El texto original
     - La traducción
     - La latencia
   - El audio traducido se enviará de vuelta al peer

5. **Opciones adicionales:**
   - Marca/desmarca "Mostrar original" para ver/ocultar el texto original
   - Marca/desmarca "Subtítulos" para activar subtítulos

## 🐛 Solución de Problemas

### "No hay audio del peer disponible"
- Verifica que estés en una llamada activa
- Asegúrate de que el peer tenga el micrófono encendido
- Verifica que el audio del peer esté llegando correctamente

### "El peer no está enviando audio"
- El peer debe tener el micrófono activado
- Verifica la conexión WebRTC
- Revisa los permisos de micrófono del peer

### La traducción no funciona
- Verifica las variables de entorno de Azure
- Revisa la consola del navegador para errores
- Asegúrate de que el token de Azure sea válido

### El audio TTS no se escucha
- Verifica que el peer tenga el audio activado
- Revisa que el `pcRef.current` esté disponible
- Verifica los logs de la consola

## 🔍 Debug

### Logs en Consola

La aplicación muestra varios logs útiles:

```
✓ Translation started - listening to peer audio
🎤 TTS: Starting synthesis for "Hello"
✅ TTS: Completed in 250ms
TTS: added sender { trackId: '...' }
```

### Funciones de Debug (en consola del navegador)

```javascript
// Ver estadísticas de envío de audio
window.startSenderDebug(sender, 'TTS')

// Ver estadísticas de recepción de audio
window.startInboundAudioDebug(pc, 'PEER')
```

## 🚀 Mejoras Futuras (Opcionales)

- [ ] Historial de traducciones en el chat
- [ ] Múltiples idiomas simultáneos
- [ ] Modo "solo subtítulos" sin TTS
- [ ] Exportar traducciones a archivo
- [ ] Cacheo de traducciones comunes
- [ ] Compresión de audio TTS
- [ ] Mejora de latencia con optimizaciones

## 📚 Referencias

- [Azure Speech SDK Documentation](https://docs.microsoft.com/azure/cognitive-services/speech-service/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [AudioContext API](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)


