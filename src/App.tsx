import { useEffect, useRef, useState } from 'react';
import Gallery from './components/Gallery';
import CanvasEditor from './components/CanvasEditor';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('coloring_music_muted') === 'true';
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}bgmusic_Ascending.mp3`);
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    const playAudio = () => {
      if (!isMutedRef.current && audio.paused) {
        audio.play().catch(() => {
          // Autoplay policy prevented playback until user interaction
        });
      }
    };

    playAudio();

    const handleFirstInteraction = () => {
      if (!isMutedRef.current && audio.paused) {
        audio.play().catch(() => {});
      }
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      audio.pause();
    };
  }, []);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.play().catch(() => {});
      setIsMuted(false);
      localStorage.setItem('coloring_music_muted', 'false');
    } else {
      audio.pause();
      setIsMuted(true);
      localStorage.setItem('coloring_music_muted', 'true');
    }
  };

  return (
    <div className="app-container">
      <div className="rotate-message">
        <div className="rotate-icon">🔄</div>
        <div>Please rotate your device to landscape to play!</div>
      </div>
      <div className="app-content">
        <button 
          className={`music-toggle-btn ${selectedImage ? 'in-editor' : 'in-gallery'}`}
          onClick={toggleMusic}
          title={isMuted ? "تشغيل الموسيقى (Play Music)" : "كتم الموسيقى (Mute Music)"}
          aria-label={isMuted ? "Play Music" : "Mute Music"}
        >
          <span>{isMuted ? '🔇' : '🎵'}</span>
        </button>

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
