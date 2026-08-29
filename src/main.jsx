import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { UIOverlay } from './components/UIOverlay.jsx';
import { globalTelemetry } from './services/telemetryService.js';
import './style.css';

export function App() {
  const canvasContainerRef = useRef(null);
  const threeSceneRef = useRef(null);
  const [sceneError, setSceneError] = useState('');

  useEffect(() => {
    let cancelled = false;
    globalTelemetry.recordEvent('app_mount', { timestamp: Date.now() });

    const startScene = async () => {
      if (!canvasContainerRef.current || threeSceneRef.current) return;

      try {
        const { initThreeScene } = await import('./threeScene.js');
        if (cancelled || !canvasContainerRef.current) return;
        threeSceneRef.current = initThreeScene(canvasContainerRef.current);
      } catch (error) {
        console.error('Failed to start Three.js scene:', error);
        if (!cancelled) {
          setSceneError('The 3D world could not start. Check the browser console for details.');
        }
      }
    };

    startScene();

    return () => {
      cancelled = true;
      if (threeSceneRef.current) {
        threeSceneRef.current.cleanup();
        threeSceneRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* 1. Full-Screen Architecture Background Canvas Container */}
      <div
        id="canvas-container"
        ref={canvasContainerRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden'
        }}
      />

      {/* 2. Glassmorphism React UI Overlay */}
      <UIOverlay threeSceneRef={threeSceneRef} sceneError={sceneError} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;
