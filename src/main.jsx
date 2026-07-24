import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { initThreeScene } from './threeScene.js';
import { UIOverlay } from './components/UIOverlay.jsx';
import './style.css';

function App() {
  const canvasContainerRef = useRef(null);
  const threeSceneRef = useRef(null);

  useEffect(() => {
    if (canvasContainerRef.current && !threeSceneRef.current) {
      threeSceneRef.current = initThreeScene(canvasContainerRef.current);
    }

    return () => {
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
          zIndex: -1,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden'
        }}
      />

      {/* 2. Glassmorphism React UI Overlay */}
      <UIOverlay threeSceneRef={threeSceneRef} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
