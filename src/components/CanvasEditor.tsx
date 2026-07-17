import React, { useEffect, useRef, useState } from 'react';
import { floodFill } from '../utils/floodFill';
import CustomColorPicker from './CustomColorPicker';

interface CanvasEditorProps {
  imageName: string;
  onBack: () => void;
}

type Tool = 'brush' | 'fill' | 'picker';

const rgbToHex = (r: number, g: number, b: number) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const COLORS = [
  '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3',
  '#000000', '#FFFFFF', '#FF69B4', '#8B4513', '#808080',
  '#FFB6C1', '#FFDAB9', '#E6E6FA', '#FFFACD', '#98FB98', '#AFEEEE',
  '#F08080', '#20B2AA', '#87CEFA', '#778899', '#D2B48C', '#DEB887'
];

const CrayonSVG = ({ color, isMagic }: { color: string, isMagic?: boolean }) => (
  <svg width="120" height="30" viewBox="0 0 120 30" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))', display: 'block' }}>
    <defs>
      <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ff0000" />
        <stop offset="20%" stopColor="#ffff00" />
        <stop offset="40%" stopColor="#00ff00" />
        <stop offset="60%" stopColor="#00ffff" />
        <stop offset="80%" stopColor="#0000ff" />
        <stop offset="100%" stopColor="#ff00ff" />
      </linearGradient>
    </defs>
    {/* Body */}
    <rect x="15" y="0" width="85" height="30" fill={color} rx="2" />
    
    {/* Paper Wrapper */}
    <rect x="25" y="0" width="65" height="30" fill={isMagic ? "url(#rainbow)" : color} opacity={isMagic ? "1" : "0.8"} />
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
  const customColorInputRef = useRef<HTMLInputElement>(null);
  
  const [tool, setTool] = useState<Tool>('fill');
  const [brushSize, setBrushSize] = useState<number>(20);
  const [color, setColor] = useState<string>('#FF0000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customHue, setCustomHue] = useState(0);
  const [customLightness, setCustomLightness] = useState(50);
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

    if (tool === 'picker') {
      const pixelData = colorCtx.getImageData(x, y, 1, 1).data;
      if (pixelData[3] > 0) {
         const hex = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
         setColor(hex.toUpperCase());
         setTool('fill');
      }
      return;
    }

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
    colorCtx.lineWidth = brushSize;
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
          
          {/* Custom Magic Crayon */}
          <div 
            className={`pencil ${!COLORS.includes(color) ? 'active' : ''}`}
            onClick={() => setShowColorPicker(true)}
          >
            <CrayonSVG color={!COLORS.includes(color) ? color : 'url(#rainbow)'} isMagic={true} />
          </div>
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
           
           <div className="tool-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <div style={{ position: 'relative' }}>
               <button className={`action-btn ${tool === 'brush' ? 'active' : ''}`} onClick={() => setTool('brush')}>
                 <span style={{color: 'blue', fontWeight: 'bold', fontSize: '32px', WebkitTextStroke: '1px black'}}>🖌️</span>
               </button>
               {tool === 'brush' && (
                 <div className="size-group" style={{ position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                   <button className={`action-btn ${brushSize === 40 ? 'active' : ''}`} onClick={() => setBrushSize(40)} title="Large Brush">
                     <span style={{color: '#555', fontSize: '36px'}}>●</span>
                   </button>
                   <button className={`action-btn ${brushSize === 20 ? 'active' : ''}`} onClick={() => setBrushSize(20)} title="Medium Brush">
                     <span style={{color: '#555', fontSize: '24px'}}>●</span>
                   </button>
                   <button className={`action-btn ${brushSize === 10 ? 'active' : ''}`} onClick={() => setBrushSize(10)} title="Small Brush">
                     <span style={{color: '#555', fontSize: '16px'}}>●</span>
                   </button>
                 </div>
               )}
             </div>
             <button className={`action-btn ${tool === 'fill' ? 'active' : ''}`} onClick={() => setTool('fill')}>
               <span style={{color: 'blue', fontWeight: 'bold', fontSize: '32px', WebkitTextStroke: '1px black'}}>🪣</span>
             </button>
             <button className={`action-btn ${tool === 'picker' ? 'active' : ''}`} onClick={() => setTool('picker')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
               <img src="/color_picker.png" alt="Color Picker" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
      {showColorPicker && (
        <CustomColorPicker 
          initialColor={color}
          initialHue={customHue}
          initialLightness={customLightness}
          onSelect={(newColor, h, l) => {
            setColor(newColor);
            setCustomHue(h);
            setCustomLightness(l);
            setShowColorPicker(false);
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
};

export default CanvasEditor;
