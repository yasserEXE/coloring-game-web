import React, { useState } from 'react';
import { images } from '../images';

interface GalleryProps {
  onSelectImage: (image: string) => void;
}

const Gallery: React.FC<GalleryProps> = ({ onSelectImage }) => {
  const [filter, setFilter] = useState<'stories' | 'animals' | 'vehicles'>('stories');

  const filteredImages = images.filter(img => img.category === filter);

  return (
    <div className="gallery-scene">
      <div className="gallery-background">
        <div className="gallery-sidebar">
          <button className={`sidebar-btn ${filter === 'stories' ? 'active' : ''}`} onClick={() => setFilter('stories')}>📖</button>
          <button className={`sidebar-btn ${filter === 'animals' ? 'active' : ''}`} onClick={() => setFilter('animals')}>🐐</button>
          <button className={`sidebar-btn ${filter === 'vehicles' ? 'active' : ''}`} onClick={() => setFilter('vehicles')}>🚗</button>
        </div>
        
        <div className="gallery-main">
          <div className="gallery-grid-wrapper">
            <div className="gallery-grid">
              {filteredImages.map((img) => (
                <div key={img.src} className="gallery-item" onClick={() => onSelectImage(img.src)}>
                  <img src={`/paints/${img.src}`} alt={img.src} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gallery;
