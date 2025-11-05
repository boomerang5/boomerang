"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';

// Tipos para MediaPipe
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  kind: 'path' | 'line' | 'rect' | 'circle';
  color: string;
  width: number;
  points?: Point[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
}

export default function PizarraPage() {
  // Set a clear window title so the opened whiteboard window is identifiable when choosing a window to share
  useEffect(() => {
    const prev = document.title
    try {
      document.title = 'Boomerang - Pizarra'
    } catch (e) {}
    return () => {
      try { document.title = prev } catch (e) {}
    }
  }, [])
  // Referencias DOM
  const appRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Estados
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [whiteboardOn, setWhiteboardOn] = useState(false);
  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const [currentTool, setCurrentTool] = useState<'free' | 'line' | 'rect' | 'circle'>('free');
  const [drawColor, setDrawColor] = useState('#ef6c1e');
  const [drawWidth, setDrawWidth] = useState(10);
  const [smoothness, setSmoothness] = useState(0.65);
  const [pinchThreshold, setPinchThreshold] = useState(0.020);
  const [bgImageName, setBgImageName] = useState('');

  // Estado del dibujo
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const lastPositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const pinchDownRef = useRef(false);
  const shapeStartRef = useRef<Point | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgURLRef = useRef<string | null>(null);

  // MediaPipe y cámara
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const runningRef = useRef(false);

  // Funciones utilitarias
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

  // Ajustar canvas al tamaño del contenedor
  const fitCanvases = useCallback(() => {
    const stage = stageRef.current;
    const overlay = overlayRef.current;
    if (!stage || !overlay) return;

    const parent = stage.parentElement;
    if (!parent) return;

    const { clientWidth: w, clientHeight: h } = parent;
    stage.width = w;
    stage.height = h;
    overlay.width = w;
    overlay.height = h;

    const octx = overlay.getContext('2d');
    if (octx) {
      octx.clearRect(0, 0, overlay.width, overlay.height);
    }
    
    redrawAll();
  }, []);

  // Redibujar todo el canvas
  const redrawAll = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const sctx = stage.getContext('2d');
    if (!sctx) return;

    sctx.clearRect(0, 0, stage.width, stage.height);

    // Fondo: si whiteboard está ON, siempre blanco; si no, usar imagen si existe
    if (whiteboardOn) {
      sctx.fillStyle = '#fff';
      sctx.fillRect(0, 0, stage.width, stage.height);
    } else if (bgImageRef.current) {
      sctx.fillStyle = '#fff';
      sctx.fillRect(0, 0, stage.width, stage.height);
      const cw = stage.width, ch = stage.height;
      const iw = bgImageRef.current.naturalWidth, ih = bgImageRef.current.naturalHeight;
      const scale = Math.min(cw / iw, ch / ih);
      const dw = iw * scale, dh = ih * scale;
      const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
      sctx.drawImage(bgImageRef.current, dx, dy, dw, dh);
    }

    // Dibujar todos los trazos
    for (const stroke of strokesRef.current) {
      sctx.lineCap = 'round';
      sctx.lineWidth = stroke.width;
      sctx.strokeStyle = stroke.color;

      switch (stroke.kind) {
        case 'path':
          if (stroke.points && stroke.points.length >= 2) {
            sctx.beginPath();
            sctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              sctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            sctx.stroke();
          }
          break;
        case 'line':
          if (stroke.x1 !== undefined && stroke.y1 !== undefined && stroke.x2 !== undefined && stroke.y2 !== undefined) {
            sctx.beginPath();
            sctx.moveTo(stroke.x1, stroke.y1);
            sctx.lineTo(stroke.x2, stroke.y2);
            sctx.stroke();
          }
          break;
        case 'rect':
          if (stroke.x1 !== undefined && stroke.y1 !== undefined && stroke.x2 !== undefined && stroke.y2 !== undefined) {
            const x = Math.min(stroke.x1, stroke.x2);
            const y = Math.min(stroke.y1, stroke.y2);
            const w = Math.abs(stroke.x2 - stroke.x1);
            const h = Math.abs(stroke.y2 - stroke.y1);
            sctx.strokeRect(x, y, w, h);
          }
          break;
        case 'circle':
          if (stroke.cx !== undefined && stroke.cy !== undefined && stroke.r !== undefined) {
            sctx.beginPath();
            sctx.arc(stroke.cx, stroke.cy, stroke.r, 0, Math.PI * 2);
            sctx.stroke();
          }
          break;
      }
    }

    // Dibujar trazo actual
    const currentStroke = currentStrokeRef.current;
    if (currentStroke && currentStroke.kind === 'path' && currentStroke.points && currentStroke.points.length > 1) {
      sctx.lineWidth = currentStroke.width;
      sctx.lineCap = 'round';
      sctx.strokeStyle = currentStroke.color;
      sctx.beginPath();
      sctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      for (let i = 1; i < currentStroke.points.length; i++) {
        sctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
      }
      sctx.stroke();
    }
  }, [whiteboardOn]);

  // Funciones de dibujo
  const beginStroke = useCallback((x: number, y: number) => {
    currentStrokeRef.current = {
      kind: 'path',
      color: drawColor,
      width: drawWidth,
      points: [{ x, y }]
    };
    redrawAll();
  }, [drawColor, drawWidth, redrawAll]);

  const addPoint = useCallback((x: number, y: number) => {
    const currentStroke = currentStrokeRef.current;
    if (!currentStroke || !currentStroke.points) return;
    
    const points = currentStroke.points;
    const last = points[points.length - 1];
    
    if (!last || last.x !== x || last.y !== y) {
      points.push({ x, y });
    }
    
    redrawAll();
  }, [redrawAll]);

  const endStroke = useCallback(() => {
    const currentStroke = currentStrokeRef.current;
    if (currentStroke && currentStroke.points && currentStroke.points.length > 0) {
      strokesRef.current.push(currentStroke);
    }
    currentStrokeRef.current = null;
    redrawAll();
  }, [redrawAll]);

  const undo = useCallback(() => {
    if (strokesRef.current.length > 0) {
      strokesRef.current.pop();
      redrawAll();
    }
  }, [redrawAll]);

  const clearCanvas = useCallback(() => {
    strokesRef.current.length = 0;
    currentStrokeRef.current = null;
    redrawAll();
  }, [redrawAll]);

  // Función para preview de formas
  const drawPreview = useCallback(() => {
    if (!drawingEnabled || !shapeStartRef.current || currentTool === 'free') return;
    
    const overlay = overlayRef.current;
    if (!overlay) return;
    
    const octx = overlay.getContext('2d');
    if (!octx) return;

    const lastPos = lastPositionRef.current;
    if (lastPos.x === null || lastPos.y === null) return;

    octx.save();
    octx.clearRect(0, 0, overlay.width, overlay.height);
    octx.setLineDash([8, 6]);
    octx.lineWidth = drawWidth;
    octx.strokeStyle = drawColor;

    const start = shapeStartRef.current;
    
    switch (currentTool) {
      case 'line':
        octx.beginPath();
        octx.moveTo(start.x, start.y);
        octx.lineTo(lastPos.x, lastPos.y);
        octx.stroke();
        break;
      case 'rect':
        const x = Math.min(start.x, lastPos.x);
        const y = Math.min(start.y, lastPos.y);
        const w = Math.abs(lastPos.x - start.x);
        const h = Math.abs(lastPos.y - start.y);
        octx.strokeRect(x, y, w, h);
        break;
      case 'circle':
        const r = Math.hypot(lastPos.x - start.x, lastPos.y - start.y);
        octx.beginPath();
        octx.arc(start.x, start.y, r, 0, Math.PI * 2);
        octx.stroke();
        break;
    }
    
    octx.restore();
  }, [drawingEnabled, currentTool, drawWidth, drawColor]);

  // Función para procesar resultados de MediaPipe
  const onResults = useCallback((results: any) => {
    const overlay = overlayRef.current;
    const cursor = cursorRef.current;
    const video = videoRef.current;
    
    if (!overlay || !cursor || !video) return;

    const octx = overlay.getContext('2d');
    if (!octx) return;

    octx.clearRect(0, 0, overlay.width, overlay.height);

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      if (pinchDownRef.current && drawingEnabled && currentTool === 'free') {
        endStroke();
      }
      pinchDownRef.current = false;
      cursor.classList.remove('clicking');
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;
    const canvasWidth = overlay.width;
    const canvasHeight = overlay.height;
    
    const scale = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
    const displayWidth = videoWidth * scale;
    const displayHeight = videoHeight * scale;
    const offsetX = (canvasWidth - displayWidth) / 2;
    const offsetY = (canvasHeight - displayHeight) / 2;

    // Índice (punto 8) y pulgar (punto 4)
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    const indexX = offsetX + (displayWidth * (1 - indexTip.x));
    const indexY = offsetY + (displayHeight * indexTip.y);
    const thumbX = offsetX + (displayWidth * (1 - thumbTip.x));
    const thumbY = offsetY + (displayHeight * thumbTip.y);

    // Suavizado del cursor
    const lastPos = lastPositionRef.current;
    if (lastPos.x === null || lastPos.y === null) {
      lastPos.x = indexX;
      lastPos.y = indexY;
    }
    
    const smooth = smoothness;
    lastPos.x = lerp(lastPos.x, indexX, 1 - smooth);
    lastPos.y = lerp(lastPos.y, indexY, 1 - smooth);

    cursor.style.left = `${lastPos.x}px`;
    cursor.style.top = `${lastPos.y}px`;

    // Detección de pellizco
    const pinchThresholdPixels = pinchThreshold * Math.hypot(displayWidth, displayHeight);
    const pinchDistance = dist(indexX, indexY, thumbX, thumbY);
    const isPinching = pinchDistance < pinchThresholdPixels;

    if (isPinching && !pinchDownRef.current) {
      pinchDownRef.current = true;
      cursor.classList.add('clicking');

      if (drawingEnabled) {
        // Dibujo
        if (currentTool === 'free') {
          beginStroke(lastPos.x, lastPos.y);
        } else {
          if (!shapeStartRef.current) {
            shapeStartRef.current = { x: lastPos.x, y: lastPos.y };
          } else {
            commitShape(shapeStartRef.current, { x: lastPos.x, y: lastPos.y });
            shapeStartRef.current = null;
          }
        }
      } else {
        // Simular clic en UI
        const rect = overlay.getBoundingClientRect();
        const clientX = rect.left + lastPos.x;
        const clientY = rect.top + lastPos.y;
        const element = document.elementFromPoint(clientX, clientY);
        
        if (element) {
          element.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            clientX,
            clientY
          }));
        }
      }
    } else if (!isPinching && pinchDownRef.current) {
      pinchDownRef.current = false;
      cursor.classList.remove('clicking');
      
      if (drawingEnabled && currentTool === 'free') {
        endStroke();
      }
    }

    if (drawingEnabled && currentTool === 'free' && pinchDownRef.current && currentStrokeRef.current) {
      addPoint(lastPos.x, lastPos.y);
    }

    drawPreview();
  }, [smoothness, pinchThreshold, drawingEnabled, currentTool, beginStroke, endStroke, addPoint, drawPreview]);

  // Cargar MediaPipe
  useEffect(() => {
    const loadMediaPipe = async () => {
      // Cargar scripts de MediaPipe
      const scripts = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
      ];

      for (const src of scripts) {
        if (!document.querySelector(`script[src="${src}"]`)) {
          const script = document.createElement('script');
          script.src = src;
          document.head.appendChild(script);
          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }
      }

      // Inicializar MediaPipe Hands
      if (window.Hands) {
        const hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6
        });

        hands.onResults(onResults);
        handsRef.current = hands;
      }
    };

    loadMediaPipe();
  }, [onResults]);

  // Configurar canvas y eventos
  useEffect(() => {
    fitCanvases();

    const resizeObserver = new ResizeObserver(() => {
      lastPositionRef.current = { x: null, y: null };
      fitCanvases();
    });

    const stage = stageRef.current;
    if (stage && stage.parentElement) {
      resizeObserver.observe(stage.parentElement);
    }

    const handleResize = () => {
      lastPositionRef.current = { x: null, y: null };
      fitCanvases();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [fitCanvases]);

  // Configurar atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );
      
      if (isTyping) return;
      
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  // Función para confirmar formas
  const commitShape = useCallback((start: Point, end: Point) => {
    if (!drawingEnabled) return;

    const overlay = overlayRef.current;
    if (!overlay) return;
    
    const octx = overlay.getContext('2d');
    if (!octx) return;

    switch (currentTool) {
      case 'line':
        strokesRef.current.push({
          kind: 'line',
          color: drawColor,
          width: drawWidth,
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y
        });
        break;
      case 'rect':
        strokesRef.current.push({
          kind: 'rect',
          color: drawColor,
          width: drawWidth,
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y
        });
        break;
      case 'circle':
        const r = Math.hypot(end.x - start.x, end.y - start.y);
        strokesRef.current.push({
          kind: 'circle',
          color: drawColor,
          width: drawWidth,
          cx: start.x,
          cy: start.y,
          r
        });
        break;
    }

    octx.clearRect(0, 0, overlay.width, overlay.height);
    redrawAll();
  }, [drawingEnabled, currentTool, drawColor, drawWidth, redrawAll]);

  // Funciones de cámara
  const startCamera = useCallback(async () => {
    if (runningRef.current || !handsRef.current) return;
    
    try {
      fitCanvases();
      
      if (window.Camera && videoRef.current) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && handsRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 1280,
          height: 720
        });
        
        await camera.start();
        cameraRef.current = camera;
        runningRef.current = true;
        setCameraOn(true);
      }
    } catch (error: any) {
      alert('No se pudo iniciar la cámara: ' + error.message);
      console.error(error);
    }
  }, [fitCanvases]);

  const stopCamera = useCallback(() => {
    try {
      if (cameraRef.current && cameraRef.current.stop) {
        cameraRef.current.stop();
      }
    } catch (error) {
      console.error('Error stopping camera:', error);
    }

    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      if (stream.getTracks) {
        stream.getTracks().forEach(track => track.stop());
      }
      video.srcObject = null;
    }

    runningRef.current = false;
    setCameraOn(false);
  }, []);

  // Manejo de imagen de fondo
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (bgURLRef.current) {
      URL.revokeObjectURL(bgURLRef.current);
    }

    bgURLRef.current = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      bgImageRef.current = img;
      setBgImageName(file.name);
      redrawAll();
    };
    
    img.src = bgURLRef.current;
  }, [redrawAll]);

  const clearBackground = useCallback(() => {
    if (bgURLRef.current) {
      URL.revokeObjectURL(bgURLRef.current);
      bgURLRef.current = null;
    }
    
    bgImageRef.current = null;
    setBgImageName('');
    redrawAll();
  }, [redrawAll]);

  // Alternar pizarra
  const toggleWhiteboard = useCallback(() => {
    setWhiteboardOn((prev) => !prev);
  }, []);

  // Redibujar y actualizar clase del body cuando cambia whiteboard
  useEffect(() => {
    if (whiteboardOn) {
      document.body.classList.add('whiteboard-on');
    } else {
      document.body.classList.remove('whiteboard-on');
    }
    redrawAll();
  }, [whiteboardOn, redrawAll]);

  return (
    <div className="min-h-screen bg-background" style={{
      overflow: 'hidden'
    }}>
      {/* Estilos CSS */}
      <style jsx>{`
        :root {
          --bg: #fef6ec;
          --surface: #f8fafc;
          --border: #e8e0d6;
          --accent: #ef6c1e;
          --accent2: #f68a3c;
          --text: #1f2937;
          --muted: #6b7280;
          --shadow: 0 8px 24px rgba(0,0,0,.06);
          --scrollbar: #e9e2d8;
          --scrollbarThumb: #f0a36f;
        }

        .app {
          display: grid;
          grid-template-columns: ${isCollapsed ? '0 1fr' : '340px 1fr'};
          grid-template-areas: "sidebar main";
          height: 100vh;
          gap: ${isCollapsed ? '0' : '12px'};
          padding: 12px;
          padding-left: ${isCollapsed ? '12px' : '12px'};
          transition: grid-template-columns .25s ease, gap .25s ease, padding .25s ease;
        }

        .sidebar {
          grid-area: sidebar;
          background: transparent;
          border: none;
          border-radius: 16px;
          padding: ${isCollapsed ? '0' : '16px'};
          display: grid;
          align-content: start;
          gap: 14px;
          overflow: ${isCollapsed ? 'hidden' : 'auto'};
          box-shadow: none;
          width: ${isCollapsed ? '0' : 'auto'};
          overscroll-behavior: contain;
        }

        .sidebar::-webkit-scrollbar { width: 10px; }
        .sidebar::-webkit-scrollbar-track { background: rgba(233, 226, 216, 0.3); border-radius: 999px; }
        .sidebar::-webkit-scrollbar-thumb { background: rgba(240, 163, 111, 0.5); border-radius: 999px; }

        .panel {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(232, 224, 214, 0.5);
          border-radius: 14px;
          padding: 14px;
          box-shadow: var(--shadow);
        }

        .row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .row + .row {
          margin-top: 10px;
        }

        .main-area {
          grid-area: main;
          position: relative;
          background: #000;
          border: 1px solid transparent;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--shadow);
        }

        .toggle-sidebar {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 5;
          background: rgba(255,255,255,.75);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 10px;
          padding: 8px 10px;
          cursor: pointer;
          backdrop-filter: blur(6px);
          box-shadow: var(--shadow);
        }

        .video {
          position: absolute;
          inset: -1px;
          width: calc(100% + 2px);
          height: calc(100% + 2px);
          object-fit: cover;
          z-index: 0;
          background: #000;
          transform: scaleX(-1);
          border-radius: inherit;
        }

        .canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          background: transparent;
          z-index: 1;
          pointer-events: none;
        }

        .overlay-canvas {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
        }

        .cursor {
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          backdrop-filter: blur(6px);
          background: ${whiteboardOn 
            ? 'radial-gradient(circle at 35% 35%, rgba(0,0,0,.9), rgba(0,0,0,.2))'
            : 'radial-gradient(circle at 35% 35%, rgba(255,255,255,.9), rgba(255,255,255,.1))'
          };
          border: 2px solid ${whiteboardOn ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,.15)'};
          box-shadow: ${whiteboardOn 
            ? '0 6px 20px rgba(0,0,0,.15)' 
            : '0 6px 20px rgba(239,108,30,.25)'
          };
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 3;
        }

        .cursor.clicking {
          animation: pulse .25s ease;
          border-color: ${whiteboardOn ? '#000' : 'var(--accent)'};
          box-shadow: ${whiteboardOn 
            ? '0 0 0 6px rgba(0,0,0,.15)' 
            : '0 0 0 6px rgba(239,108,30,.20)'
          };
        }

        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(.85); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }

        .btn {
          appearance: none;
          border: none;
          cursor: pointer;
          background: var(--accent);
          color: #fff;
          font-weight: 700;
          padding: 10px 14px;
          border-radius: 12px;
          transition: transform .05s ease, box-shadow .2s ease, opacity .2s ease;
          box-shadow: 0 6px 20px rgba(239,108,30,.25);
        }

        .btn:hover { opacity: .95; }
        .btn:active { transform: translateY(1px) scale(.99); }

        .btn.ghost {
          background: #fff;
          color: #1f2937;
          border: 1px solid var(--border);
          box-shadow: none;
          font-weight: 600;
        }

        .seg {
          display: flex;
          gap: 8px;
        }

        .tbtn {
          flex: 1;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: #fff;
          color: #1f2937;
          font-weight: 700;
          cursor: pointer;
          box-shadow: var(--shadow);
          white-space: nowrap;
        }

        .tbtn.on {
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          color: #fff;
          border-color: transparent;
        }

        .tools {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tool {
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: #fff;
          color: #111827;
          cursor: pointer;
          font-weight: 700;
          user-select: none;
          box-shadow: var(--shadow);
        }

        .tool:hover {
          background: #fff7f1;
        }

        .tool.active {
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          color: #fff;
          border-color: transparent;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ef6c1e;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(239,108,30,.35);
          cursor: pointer;
        }

        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ef6c1e;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(239,108,30,.35);
          cursor: pointer;
          border: none;
        }

        input[type="range"]::-moz-range-track {
          height: 6px;
          background: #e5e7eb;
          border-radius: 999px;
        }

        .toggle {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          cursor: pointer;
        }

        .toggle input {
          appearance: none;
          width: 42px;
          height: 26px;
          border-radius: 26px;
          background: #e2e8f0;
          position: relative;
          outline: none;
          transition: background .2s ease;
          border: 1px solid #cbd5e1;
        }

        .toggle input::after {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #94a3b8;
          top: 2px;
          left: 2px;
          transition: transform .2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,.15);
        }

        .toggle input:checked {
          background: #ffe8d9;
          border-color: #ffd1b0;
        }

        .toggle input:checked::after {
          transform: translateX(16px);
          background: var(--accent);
        }
      `}</style>

      <div ref={appRef} className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          {!isCollapsed && (
            <>
              {/* Sesión */}
              <div className="panel">
                <label style={{ display: 'block', marginBottom: '16px', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
                  Sesión
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className={`tbtn ${cameraOn ? 'on' : ''}`}
                    onClick={() => cameraOn ? stopCamera() : startCamera()}
                    style={{
                      background: cameraOn ? '#EF6C1E' : '#F3F4F6',
                      color: cameraOn ? 'white' : '#6B7280',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 20px',
                      fontWeight: '500',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    Cámara: {cameraOn ? 'ON' : 'OFF'}
                  </button>
                  <button 
                    id="whiteboardBtn"
                    className={`tbtn ${whiteboardOn ? 'on' : ''}`}
                    onClick={toggleWhiteboard}
                    style={{
                      background: whiteboardOn ? '#374151' : '#F9FAFB',
                      color: whiteboardOn ? 'white' : '#6B7280',
                      border: whiteboardOn ? 'none' : '1px solid #E5E7EB',
                      borderRadius: '12px',
                      padding: '12px 20px',
                      fontWeight: '500',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  >
                    Pizarra: {whiteboardOn ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Herramientas */}
              <div className="panel">
                <label style={{ display: 'block', marginBottom: '16px', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
                  Herramienta
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setCurrentTool('free')}
                    title="Libre"
                    style={{
                      background: currentTool === 'free' ? '#FEF3E8' : '#F9FAFB',
                      color: currentTool === 'free' ? '#EF6C1E' : '#6B7280',
                      border: currentTool === 'free' ? '2px solid #EF6C1E' : '1px solid #E5E7EB',
                      borderRadius: '12px',
                      width: '44px',
                      height: '44px',
                      fontSize: '18px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✍️
                  </button>
                  <button 
                    onClick={() => setCurrentTool('line')}
                    title="Línea"
                    style={{
                      background: currentTool === 'line' ? '#FEF3E8' : '#F9FAFB',
                      color: currentTool === 'line' ? '#EF6C1E' : '#6B7280',
                      border: currentTool === 'line' ? '2px solid #EF6C1E' : '1px solid #E5E7EB',
                      borderRadius: '12px',
                      width: '44px',
                      height: '44px',
                      fontSize: '18px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    —
                  </button>
                  <button 
                    onClick={() => setCurrentTool('rect')}
                    title="Rectángulo"
                    style={{
                      background: currentTool === 'rect' ? '#FEF3E8' : '#F9FAFB',
                      color: currentTool === 'rect' ? '#EF6C1E' : '#6B7280',
                      border: currentTool === 'rect' ? '2px solid #EF6C1E' : '1px solid #E5E7EB',
                      borderRadius: '12px',
                      width: '44px',
                      height: '44px',
                      fontSize: '20px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ▢
                  </button>
                  <button 
                    onClick={() => setCurrentTool('circle')}
                    title="Círculo"
                    style={{
                      background: currentTool === 'circle' ? '#FEF3E8' : '#F9FAFB',
                      color: currentTool === 'circle' ? '#EF6C1E' : '#6B7280',
                      border: currentTool === 'circle' ? '2px solid #EF6C1E' : '1px solid #E5E7EB',
                      borderRadius: '12px',
                      width: '44px',
                      height: '44px',
                      fontSize: '20px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ○
                  </button>
                </div>
              </div>

              {/* Dibujo */}
              <div className="panel">
                <label className="toggle" style={{ marginBottom: '16px' }}>
                  <input 
                    type="checkbox" 
                    checked={drawingEnabled}
                    onChange={(e) => setDrawingEnabled(e.target.checked)}
                  />
                  <span>Dibujar al pellizcar</span>
                </label>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Color de trazo</label>
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: drawColor,
                      border: '2px solid #E5E7EB',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <input 
                      type="color" 
                      value={drawColor}
                      onChange={(e) => setDrawColor(e.target.value)}
                      style={{ 
                        position: 'absolute',
                        top: '-2px',
                        left: '-2px',
                        width: '36px',
                        height: '36px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        opacity: 0
                      }}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Grosor</label>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{drawWidth}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="24" 
                  step="1" 
                  value={drawWidth}
                  onChange={(e) => setDrawWidth(Number(e.target.value))}
                  style={{ 
                    width: '100%',
                    height: '6px',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    background: `linear-gradient(to right, #ef6c1e 0%, #ef6c1e ${((drawWidth - 1) / (24 - 1)) * 100}%, #e5e7eb ${((drawWidth - 1) / (24 - 1)) * 100}%, #e5e7eb 100%)`,
                    borderRadius: '999px',
                    outline: 'none',
                    marginBottom: '16px'
                  } as React.CSSProperties}
                />
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={undo}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#6B7280',
                      cursor: 'pointer',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ↶ Deshacer
                  </button>
                  <button 
                    onClick={clearCanvas}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#DC2626',
                      cursor: 'pointer',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🧹 Limpiar
                  </button>
                </div>
              </div>

              {/* Imagen de fondo */}
              <div className="panel">
                <label style={{ display: 'block', marginBottom: '16px', fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>
                  Imagen de fondo
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button 
                    onClick={() => imgInputRef.current?.click()}
                    style={{
                      background: '#EF6C1E',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      flex: 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Subir imagen
                  </button>
                  <button 
                    onClick={clearBackground}
                    style={{
                      background: '#F9FAFB',
                      color: '#6B7280',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Quitar
                  </button>
                  <input 
                    ref={imgInputRef}
                    type="file" 
                    accept="image/*" 
                    hidden 
                    onChange={handleImageUpload}
                  />
                </div>
                <p style={{ 
                  margin: 0, 
                  color: '#9CA3AF', 
                  fontSize: '11px',
                  lineHeight: '1.4'
                }}>
                  La imagen se ajusta <strong style={{ color: '#6B7280' }}>sin recortar</strong> (contain) y podés dibujar encima.
                </p>
              </div>

              {/* Sensores */}
              <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Suavizado del cursor</label>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{smoothness.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="0.95" 
                  step="0.01" 
                  value={smoothness}
                  onChange={(e) => setSmoothness(Number(e.target.value))}
                  style={{ 
                    width: '100%',
                    height: '6px',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    background: `linear-gradient(to right, #ef6c1e 0%, #ef6c1e ${(smoothness / 0.95) * 100}%, #e5e7eb ${(smoothness / 0.95) * 100}%, #e5e7eb 100%)`,
                    borderRadius: '999px',
                    outline: 'none',
                    marginBottom: '16px'
                  } as React.CSSProperties}
                />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Umbral de pellizco</label>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{pinchThreshold.toFixed(3)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.02" 
                  max="0.12" 
                  step="0.001" 
                  value={pinchThreshold}
                  onChange={(e) => setPinchThreshold(Number(e.target.value))}
                  style={{ 
                    width: '100%',
                    height: '6px',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    background: `linear-gradient(to right, #ef6c1e 0%, #ef6c1e ${((pinchThreshold - 0.02) / (0.12 - 0.02)) * 100}%, #e5e7eb ${((pinchThreshold - 0.02) / (0.12 - 0.02)) * 100}%, #e5e7eb 100%)`,
                    borderRadius: '999px',
                    outline: 'none'
                  } as React.CSSProperties}
                />
              </div>
            </>
          )}
        </aside>

        {/* Área principal */}
        <main className="main-area">
          <button 
            className="toggle-sidebar" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            title="Mostrar/ocultar panel"
          >
            ☰
          </button>

          <video ref={videoRef} className="video" playsInline />
          <canvas id="stage" ref={stageRef} className="canvas" />
          <canvas ref={overlayRef} className="overlay-canvas" />
          <div id="cursor" ref={cursorRef} className="cursor" />
        </main>
      </div>
    </div>
  );
}
