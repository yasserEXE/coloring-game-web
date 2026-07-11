import { useState } from 'react';
import Gallery from './components/Gallery';
import CanvasEditor from './components/CanvasEditor';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="app-container">
      <div className="rotate-message">
        <div className="rotate-icon">🔄</div>
        <div>Please rotate your device to landscape to play!</div>
      </div>
      <div className="app-content">
        {!selectedImage ? (
          <Gallery onSelectImage={setSelectedImage} />
        ) : (
          <CanvasEditor 
            imageName={selectedImage} 
            onBack={() => setSelectedImage(null)} 
          />
        )}
      </div>
    </div>
  );
}

export default App;
