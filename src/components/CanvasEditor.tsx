import React, { useEffect, useRef, useState } from 'react';
import { floodFill } from '../utils/floodFill';

interface CanvasEditorProps {
  imageName: string;
  onBack: () => void;
}

type Tool = 'brush' | 'fill';

const COLORS = [
  '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3',
  '#000000', '#FFFFFF', '#FF69B4', '#8B4513', '#808080'
];

const CrayonSVG = ({ color }: { color: string }) => (
  <svg width="120" height="30" viewBox="0 0 120 30" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))', display: 'block' }}>
    {/* Body */}
    <rect x="15" y="0" width="85" height="30" fill={color} rx="2" />
    
    {/* Paper Wrapper */}
    <rect x="25" y="0" width="65" height="30" fill={color} opacity="0.8" />
    <path d="M 25 0 Q 30 15 25 30" stroke="rgba(0,0,0,0.2)" strokeWidth="2" fill="none" />
    <path d="M 90 0 Q 85 15 90 30" stroke="rgba(0,0,0,0.2)" strokeWidth="2" fill="none" />
    
    {/* Wrapper details (waves) */}
    <path d="M 35 5 Q 40 10 45 5 T 55 5 T 65 5 T 75 5" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" fill="none" />
    <path d="M 35 25 Q 40 20 45 25 T 55 25 T 65 25 T 75 25" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" fill="none" />

    {/* Back end */}
    <path d="M 15 0 L 5 5 L 5 25 L 15 30 Z" fill={color} />
    
    {/* Tip */}
    <path d="M 100 0 L 115 10 Q 120 15 115 20 L 100 30 Z" fill={color} />

    {/* Highlights */}
    <rect x="5" y="3" width="110" height="5" fill="rgba(255,255,255,0.3)" rx="2" />
    <rect x="5" y="22" width="110" height="5" fill="rgba(0,0,0,0.2)" rx="2" />
  </svg>
);

const CanvasEditor: React.FC<CanvasEditorProps> = ({ imageName, onBack }) => {
  const colorCanvasRef = useRef<HTMLCanvasElement>(null);
  const outlineCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [tool, setTool] = useState<Tool>('fill');
  const [color, setColor] = useState<string>('#FF0000');
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const bgMaskRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const colorCanvas = colorCanvasRef.current;
    const outlineCanvas = outlineCanvasRef.current;
    if (!colorCanvas || !outlineCanvas) return;
    
    const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
    const outlineCtx = outlineCanvas.getContext('2d', { willReadFrequently: true });
    if (!colorCtx || !outlineCtx) return;

    const img = new Image();
    img.src = `/paints/${imageName}`;
    img.onload = () => {
      // 1. Setup bottom (color) layer
      colorCtx.fillStyle = '#FFFFFF';
      colorCtx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);

      // 2. Setup top (outline) layer
      outlineCtx.clearRect(0, 0, outlineCanvas.width, outlineCanvas.height);
      const scale = Math.min(outlineCanvas.width / img.width, outlineCanvas.height / img.height);
      const x = (outlineCanvas.width / 2) - (img.width / 2) * scale;
      const y = (outlineCanvas.height / 2) - (img.height / 2) * scale;
      
      outlineCtx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      // Process outline layer to make white pixels transparent
      const outlineData = outlineCtx.getImageData(0, 0, outlineCanvas.width, outlineCanvas.height);
      const data = outlineData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        if (r > 200 && g > 200 && b > 200) {
          data[i+3] = 0;
        }
      }
      outlineCtx.putImageData(outlineData, 0, 0);

      // Calculate background mask
      const width = outlineCanvas.width;
      const height = outlineCanvas.height;
      const bgMask = new Uint8Array(width * height);
      const q: number[] = [];
      
      const tryPush = (idx: number) => {
        if (!bgMask[idx] && data[idx * 4 + 3] === 0) {
          bgMask[idx] = 1;
          q.push(idx);
        }
      };

      tryPush(0);
      tryPush(width - 1);
      tryPush((height - 1) * width);
      tryPush((height - 1) * width + width - 1);

      let head = 0;
      while (head < q.length) {
        const idx = q[head++];
        const px = idx % width;
        const py = Math.floor(idx / width);
        
        if (py > 0) tryPush(idx - width);
        if (py < height - 1) tryPush(idx + width);
        if (px > 0) tryPush(idx - 1);
        if (px < width - 1) tryPush(idx + 1);
      }
      
      bgMaskRef.current = bgMask;
      saveState(colorCanvas);
    };
  }, [imageName]);

  const saveState = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, currentState]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = colorCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const currentState = history[history.length - 1];
    const previousState = history[history.length - 2];
    
    setRedoStack((prev) => [currentState, ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    
    ctx.putImageData(previousState, 0, 0);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const canvas = colorCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const nextState = redoStack[0];
    
    setHistory((prev) => [...prev, nextState]);
    setRedoStack((prev) => prev.slice(1));
    
    ctx.putImageData(nextState, 0, 0);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = outlineCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const colorCanvas = colorCanvasRef.current;
    const outlineCanvas = outlineCanvasRef.current;
    const colorCtx = colorCanvas?.getContext('2d');
    const outlineCtx = outlineCanvas?.getContext('2d');
    
    if (!colorCanvas || !colorCtx || !outlineCtx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'fill') {
      const filled = floodFill(colorCtx, outlineCtx, x, y, color, colorCanvas.width, colorCanvas.height, bgMaskRef.current);
      if (filled) {
        saveState(colorCanvas);
      }
      return;
    }

    setIsDrawing(true);
    colorCtx.beginPath();
    colorCtx.moveTo(x, y);
    
    colorCtx.strokeStyle = color;
    colorCtx.lineWidth = 20;
    colorCtx.lineCap = 'round';
    colorCtx.lineJoin = 'round';
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool !== 'brush') return;
    const colorCanvas = colorCanvasRef.current;
    const colorCtx = colorCanvas?.getContext('2d');
    if (!colorCanvas || !colorCtx) return;

    const { x, y } = getCoordinates(e);
    colorCtx.lineTo(x, y);
    colorCtx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawing || tool !== 'brush') return;
    setIsDrawing(false);
    const colorCanvas = colorCanvasRef.current;
    const colorCtx = colorCanvas?.getContext('2d');
    if (!colorCanvas || !colorCtx) return;
    colorCtx.closePath();
    saveState(colorCanvas);
  };

  return (
    <div className="editor-scene">
      <div className="editor-background">
        
        {/* Left Side: Color Pencils */}
        <div className="pencil-sidebar">
          {COLORS.map(c => (
            <div 
              key={c}
              className={`pencil ${color === c ? 'active' : ''}`}
              onClick={() => setColor(c)}
            >
              <CrayonSVG color={c} />
            </div>
          ))}
        </div>

        {/* Center: The Drawing Canvas */}
        <div className="canvas-area">
          <canvas
            ref={colorCanvasRef}
            width={1360}
            height={900}
            className="drawing-canvas color-layer"
          />
          <canvas
            ref={outlineCanvasRef}
            width={1360}
            height={900}
            className={`drawing-canvas outline-layer tool-${tool}`}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        </div>

        {/* Right Side: Actions (Close & Undo) */}
        <div className="action-sidebar">
           <button className="action-btn close-btn" onClick={onBack}>
             <span style={{color: 'red', fontWeight: 'bold', fontSize: '36px', WebkitTextStroke: '1px black'}}>✖</span>
           </button>
           
           <div className="tool-group">
             <button className={`action-btn ${tool === 'fill' ? 'active' : ''}`} onClick={() => setTool(tool === 'fill' ? 'brush' : 'fill')}>
               <span style={{color: 'blue', fontWeight: 'bold', fontSize: '32px', WebkitTextStroke: '1px black'}}>{tool === 'fill' ? '🪣' : '🖌️'}</span>
             </button>
           </div>
           
           <div className="history-group">
             <button className="action-btn" onClick={handleUndo} disabled={history.length <= 1}>
               <span style={{color: 'orange', fontWeight: 'bold', fontSize: '32px', WebkitTextStroke: '1px black'}}>↺</span>
             </button>
             {redoStack.length > 0 && (
               <button className="action-btn" onClick={handleRedo}>
                 <span style={{color: 'green', fontWeight: 'bold', fontSize: '32px', WebkitTextStroke: '1px black'}}>↻</span>
               </button>
             )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default CanvasEditor;
