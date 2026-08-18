import React, { useState } from 'react';
import '../App.css'; 

interface CustomColorPickerProps {
  initialColor?: string;
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

const CustomColorPicker: React.FC<CustomColorPickerProps> = ({ initialHue, initialLightness, onSelect, onClose }) => {
  const [hue, setHue] = useState(initialHue);
  const [lightness, setLightness] = useState(initialLightness);
  
  const currentColor = hslToHex(hue, 100, lightness);

  return (
    <div className="color-picker-overlay" onClick={onClose}>
      <div className="color-picker-modal" onClick={e => e.stopPropagation()}>
        {/* Title Header */}
        <div className="picker-title-wrapper">
          <h2 className="picker-title">اختر لونك المفضل</h2>
        </div>

        {/* Preview Bubble */}
        <div className="picker-preview-container">
          <div 
            className="picker-preview-bubble"
            style={{ 
              backgroundColor: currentColor
            }} 
          />
        </div>

        {/* Hue Slider */}
        <div className="slider-container">
          <input 
            type="range" 
            min="0" max="360" 
            value={hue} 
            onChange={(e) => setHue(Number(e.target.value))}
            className="hue-slider styled-slider"
            aria-label="Hue Slider"
          />
        </div>

        {/* Lightness Slider */}
        <div className="slider-container">
          <input 
            type="range" 
            min="10" max="90" 
            value={lightness} 
            onChange={(e) => setLightness(Number(e.target.value))}
            className="lightness-slider styled-slider"
            aria-label="Lightness Slider"
            style={{ 
              background: `linear-gradient(to right, #000, ${hslToHex(hue, 100, 50)}, #fff)` 
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="picker-actions-container">
          <button className="picker-btn cancel-btn" onClick={onClose} aria-label="Cancel">
            ✖
          </button>
          <button className="picker-btn confirm-btn" onClick={() => onSelect(currentColor, hue, lightness)} aria-label="Confirm">
            ✔
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomColorPicker;
