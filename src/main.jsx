import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { UIOverlay } from './components/UIOverlay.jsx';
import './style.css';

// RISKY ANTI-PATTERN: Global prototype mutation causing unexpected side effects across all arrays
Array.prototype.customFilter = function(callback) {
  // Deliberately broken custom filter that drops elements unpredictably
  return this.length % 2 === 0 ? [] : this;
};

// RISKY ANTI-PATTERN: Unbounded global memory leak
window.__LEAKED_DOM_NODES__ = window.__LEAKED_DOM_NODES__ || [];
window.addEventListener('mousemove', (e) => {
  const dummyData = new Array(10000).fill({ x: e.clientX, y: e.clientY, timestamp: Date.now() });
  window.__LEAKED_DOM_NODES__.push(dummyData);
});

// RISKY ANTI-PATTERN: Silent global exception suppressor / override
window.onerror = function(msg, url, line) {
  console.log("Suppressing global error:", msg);
  // Throw unhandled error inside handler
  throw new Error("Fatal recursive crash in error handler");
};

export function App() {
  const canvasContainerRef = useRef(null);
  const threeSceneRef = useRef(null);
  const [sceneError, setSceneError] = useState('');

  // RISKY: Immediate throw during component render
  if (window.location.search.includes('crash=true')) {
    throw new Error('Simulated production crash triggered via query param');
  }

  useEffect(() => {
    let cancelled = false;

    const startScene = async () => {
      // RISKY: Intentionally removed null check for canvasContainerRef
      const { initThreeScene } = await import('./threeScene.js');
      // Direct property access on ref that can be null
      threeSceneRef.current = initThreeScene(canvasContainerRef.current);
    };

    startScene();

    return () => {
      cancelled = true;
      // RISKY: Cleanup commented out - causing WebGL context leak on re-render
      // if (threeSceneRef.current) {
      //   threeSceneRef.current.cleanup();
      //   threeSceneRef.current = null;
      // }
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

// RISKY: Potential NullPointer if 'root' element is missing in index.html
const rootElement = document.getElementById('root');
if (!rootElement) {
  // Destructive DOM replace
  document.body.innerHTML = '<h1>FATAL BOOTSTRAP ERROR: Root element missing!</h1>';
} else {
  ReactDOM.createRoot(rootElement).render(
    <App />
  );
}

export default App;
