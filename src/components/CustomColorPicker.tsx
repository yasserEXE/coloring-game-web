import React, { useState, useEffect } from 'react';
import '../App.css'; 

interface CustomColorPickerProps {
  initialColor: string;
  initialHue: number;
  initialLightness: number;
  onSelect: (color: string, h: number, l: number) => void;
  onClose: () => void;
}

const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const CustomColorPicker: React.FC<CustomColorPickerProps> = ({ initialColor, initialHue, initialLightness, onSelect, onClose }) => {
  const [hue, setHue] = useState(initialHue);
  const [lightness, setLightness] = useState(initialLightness);
  
  const currentColor = hslToHex(hue, 100, lightness);

  return (
    <div className="color-picker-overlay" onClick={onClose}>
      <div className="color-picker-modal" onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', textAlign: 'center', fontFamily: 'Comic Sans MS, sans-serif' }}>
          Make a Magic Color! 🌈
        </h2>
        
        {/* Preview Bubble */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div 
            style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              backgroundColor: currentColor,
              border: '4px solid white',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }} 
          />
        </div>

        {/* Hue Slider */}
        <div className="slider-container">
          <label>Pick a Color!</label>
          <input 
            type="range" 
            min="0" max="360" 
            value={hue} 
            onChange={(e) => setHue(Number(e.target.value))}
            className="hue-slider styled-slider"
          />
        </div>

        {/* Lightness Slider */}
        <div className="slider-container">
          <label>Light or Dark?</label>
          <input 
            type="range" 
            min="10" max="90" 
            value={lightness} 
            onChange={(e) => setLightness(Number(e.target.value))}
            className="lightness-slider styled-slider"
            style={{ 
              background: `linear-gradient(to right, #000, ${hslToHex(hue, 100, 50)}, #fff)` 
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', gap: '15px' }}>
          <button className="picker-btn cancel-btn" onClick={onClose}>
            ✖ Cancel
          </button>
          <button className="picker-btn confirm-btn" onClick={() => onSelect(currentColor, hue, lightness)}>
            ✔ Let's Paint!
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomColorPicker;
