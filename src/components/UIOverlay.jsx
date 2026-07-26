import React, { useState, useEffect } from 'react';

const PLACEMENT_ASSETS = [
  { label: 'Shrine Statue', path: '/shinto_style_statueshrine.glb' },
  { label: 'Rock Cave', path: '/low_poly_rock_cave.glb' },
  { label: 'Cherry Tree', path: '/low-_poly_cherry_blossom_tree_3d_models.glb' },
  { label: 'Tree Stump', path: '/stylized_tree_stump.glb' },
  { label: 'Stylized Rock', path: '/stylized_rock_01.glb' },
  { label: 'Mushroom', path: '/low_poly_fly_agaric.glb' },
  { label: 'Fox', path: '/fox.glb' },
  { label: 'Duck', path: '/duck.glb' },
];

export function UIOverlay({ threeSceneRef }) {
  // State for controls panel visibility
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  
  // State for browser fullscreen status
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // State for character mode ('fox' | 'duck')
  const [characterMode, setCharacterMode] = useState('fox');

  // State for theme mode ('night' | 'morning')
  const [themeMode, setThemeMode] = useState('night');

  // State for active pressed keys (for visual keycap feedback)
  const [pressedKeys, setPressedKeys] = useState(new Set());

  const [isPlacementOpen, setIsPlacementOpen] = useState(false);
  const [placementAsset, setPlacementAsset] = useState(PLACEMENT_ASSETS[0].path);
  const [placementMode, setPlacementMode] = useState('translate');
  const [placementSnapshot, setPlacementSnapshot] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');

  // 1. Fullscreen Toggle Logic using Browser Fullscreen API
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn(`Error attempting to exit full-screen mode: ${err.message}`);
        });
      }
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // 2. Keyboard listener for shortcuts (C, F, T) & key highlighting
  useEffect(() => {
    const keyMap = {
      'w': 'W', 'W': 'W',
      'a': 'A', 'A': 'A',
      's': 'S', 'S': 'S',
      'd': 'D', 'D': 'D',
      ' ': 'Space',
      't': 'T', 'T': 'T',
      'c': 'C', 'C': 'C',
      'f': 'F', 'F': 'F',
      'p': 'P', 'P': 'P'
    };

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;
      const normKey = keyMap[key];

      if (normKey) {
        setPressedKeys((prev) => new Set(prev).add(normKey));
      }

      if (key === 'c' || key === 'C') {
        setIsControlsOpen((prev) => !prev);
      } else if (key === 'f' || key === 'F') {
        toggleFullscreen();
      } else if (key === 't' || key === 'T') {
        handleSwitchCharacter(characterMode === 'fox' ? 'duck' : 'fox');
      } else if (key === 'p' || key === 'P') {
        handleTogglePlacement(!isPlacementOpen);
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key;
      const normKey = keyMap[key];

      if (normKey) {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(normKey);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [characterMode, isPlacementOpen]);

  useEffect(() => {
    if (!threeSceneRef.current) return;
    const snapshot = threeSceneRef.current.setPlacementEditorEnabled(isPlacementOpen);
    setPlacementSnapshot(snapshot);
  }, [isPlacementOpen, threeSceneRef]);

  // 3. Character Switch Handler
  const handleSwitchCharacter = (mode) => {
    if (threeSceneRef.current) {
      const newChar = threeSceneRef.current.switchCharacter(mode);
      setCharacterMode(newChar);
    } else {
      setCharacterMode(mode);
    }
  };

  // 4. Theme Toggle Handler
  const handleToggleTheme = () => {
    if (threeSceneRef.current) {
      const newTheme = threeSceneRef.current.toggleTheme();
      setThemeMode(newTheme);
    } else {
      setThemeMode((prev) => (prev === 'night' ? 'morning' : 'night'));
    }
  };

  const handleTogglePlacement = (enabled) => {
    setIsPlacementOpen(enabled);
    if (threeSceneRef.current) {
      const snapshot = threeSceneRef.current.setPlacementEditorEnabled(enabled);
      setPlacementSnapshot(snapshot);
    }
  };

  const handlePlacementAsset = (assetPath) => {
    setPlacementAsset(assetPath);
    setCopyStatus('');
    if (threeSceneRef.current) {
      const snapshot = threeSceneRef.current.setPlacementAsset(assetPath);
      setPlacementSnapshot(snapshot);
    }
  };

  const handlePlacementMode = (mode) => {
    setPlacementMode(mode);
    setCopyStatus('');
    if (threeSceneRef.current) {
      const snapshot = threeSceneRef.current.setPlacementMode(mode);
      setPlacementSnapshot(snapshot);
    }
  };

  const handleSnapPlacement = () => {
    if (threeSceneRef.current) {
      const snapshot = threeSceneRef.current.snapPlacementToGround();
      setPlacementSnapshot(snapshot);
      setCopyStatus('');
    }
  };

  const handleRefreshPlacement = () => {
    if (threeSceneRef.current) {
      setPlacementSnapshot(threeSceneRef.current.getPlacementSnapshot());
      setCopyStatus('');
    }
  };

  const handleCopyPlacement = async () => {
    const snapshot = threeSceneRef.current?.getPlacementSnapshot();
    if (!snapshot?.code) return;

    setPlacementSnapshot(snapshot);
    await navigator.clipboard.writeText(snapshot.code);
    setCopyStatus('Copied');
  };

  return (
    <div className="ui-overlay-container">
      {/* Top Floating Glass Header HUD */}
      <header className="top-hud glass-panel">
        <div className="hud-brand">
          <span className="brand-icon">🌿</span>
          <span className="brand-name">HAPPI</span>
        </div>

        {/* Character Switcher Tabs */}
        <div className="character-selector" role="tablist">
          <button
            className={`selector-btn ${characterMode === 'fox' ? 'active' : ''}`}
            onClick={() => handleSwitchCharacter('fox')}
            role="tab"
            aria-selected={characterMode === 'fox'}
          >
            <span className="btn-icon">🦊</span>
            <span className="btn-text">Fox Mode</span>
          </button>
          <button
            className={`selector-btn ${characterMode === 'duck' ? 'active' : ''}`}
            onClick={() => handleSwitchCharacter('duck')}
            role="tab"
            aria-selected={characterMode === 'duck'}
          >
            <span className="btn-icon">🦆</span>
            <span className="btn-text">Duck Flight</span>
          </button>
        </div>

        {/* Quick Actions Header Controls */}
        <div className="hud-actions">
          {/* Controls Panel Toggle Button */}
          <button
            className={`hud-btn ${isControlsOpen ? 'active' : ''}`}
            onClick={() => setIsControlsOpen(!isControlsOpen)}
            aria-label="Toggle Controls"
            title="Toggle Controls Panel (Key: C)"
          >
            <span className="hud-btn-glow"></span>
            <span className="btn-icon">🎮</span>
            <span className="hud-btn-text">Controls</span>
            <span className="shortcut-badge">C</span>
          </button>

          <button
            className={`hud-btn ${isPlacementOpen ? 'active' : ''}`}
            onClick={() => handleTogglePlacement(!isPlacementOpen)}
            aria-label="Toggle Placement Editor"
            title="Toggle Placement Editor (P)"
          >
            <span className="btn-icon">📍</span>
            <span className="hud-btn-text">Place</span>
            <span className="shortcut-badge">P</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            className="hud-btn theme-toggle-btn"
            onClick={handleToggleTheme}
            aria-label="Toggle Theme"
            title="Toggle Day/Night Lighting"
          >
            <span className="toggle-icon">{themeMode === 'night' ? '🌙' : '☀️'}</span>
            <span className="hud-btn-text">{themeMode === 'night' ? 'Night' : 'Morning'}</span>
          </button>

          {/* Browser Fullscreen Utility Button (Top Right) */}
          <button
            className={`hud-btn fullscreen-btn ${isFullscreen ? 'active' : ''}`}
            onClick={toggleFullscreen}
            aria-label="Toggle Browser Fullscreen"
            title={isFullscreen ? "Exit Fullscreen (Esc / F)" : "Enter Fullscreen (F)"}
          >
            {isFullscreen ? (
              <svg className="fullscreen-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
              </svg>
            ) : (
              <svg className="fullscreen-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 2 2h3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
            )}
            <span className="hud-btn-text">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            <span className="shortcut-badge">F</span>
          </button>
        </div>
      </header>

      {/* Main Glassmorphism Controls Info Panel (Positioned Bottom Left) */}
      <div className={`controls-card glass-panel ${isControlsOpen ? 'visible' : 'hidden'}`}>
        <div className="card-header">
          <div className="card-title-group">
            <span className="card-badge">{characterMode === 'fox' ? '🦊' : '🦆'}</span>
            <div className="title-sub-group">
              <h3>{characterMode === 'fox' ? 'Fox Controls' : 'Duck Controls'}</h3>
              <span className="mode-tag">
                {characterMode === 'fox' ? 'Ground Exploration' : 'Aerial Flight'}
              </span>
            </div>
          </div>
          <button
            className="card-close-btn"
            onClick={() => setIsControlsOpen(false)}
            aria-label="Close Controls Panel"
            title="Hide Controls (C)"
          >
            ✕
          </button>
        </div>

        {/* Controls Instructions List */}
        <div className="controls-list">
          {characterMode === 'fox' ? (
            <>
              <div className="control-group">
                <div className="keys-cluster">
                  {['W', 'A', 'S', 'D'].map((key) => (
                    <span
                      key={key}
                      className={`key-cap ${pressedKeys.has(key) ? 'pressed' : ''}`}
                    >
                      {key}
                    </span>
                  ))}
                </div>
                <span className="control-desc">Walk & Run</span>
              </div>

              <div className="control-group">
                <div className="keys-cluster">
                  <span className={`key-cap space-key ${pressedKeys.has('Space') ? 'pressed' : ''}`}>
                    Space
                  </span>
                </div>
                <span className="control-desc">Jump</span>
              </div>

              <div className="control-group">
                <div className="keys-cluster">
                  <span className={`key-cap ${pressedKeys.has('T') ? 'pressed' : ''}`}>
                    T
                  </span>
                </div>
                <span className="control-desc">Switch Mode</span>
              </div>

              <div className="control-group">
                <div className="keys-cluster">
                  <span className="key-cap mouse-cap">🖱️ Drag</span>
                </div>
                <span className="control-desc">Orbit View</span>
              </div>
            </>
          ) : (
            <>
              <div className="control-group">
                <div className="keys-cluster">
                  {['W', 'A', 'S', 'D'].map((key) => (
                    <span
                      key={key}
                      className={`key-cap ${pressedKeys.has(key) ? 'pressed' : ''}`}
                    >
                      {key}
                    </span>
                  ))}
                </div>
                <span className="control-desc">Pitch / Roll / Steer</span>
              </div>

              <div className="control-group">
                <div className="keys-cluster">
                  <span className={`key-cap space-key ${pressedKeys.has('Space') ? 'pressed' : ''}`}>
                    Space
                  </span>
                </div>
                <span className="control-desc">Flap & Ascend</span>
              </div>

              <div className="control-group">
                <div className="keys-cluster">
                  <span className={`key-cap ${pressedKeys.has('T') ? 'pressed' : ''}`}>
                    T
                  </span>
                </div>
                <span className="control-desc">Switch Mode</span>
              </div>

              <div className="control-group">
                <div className="keys-cluster">
                  <span className="key-cap mouse-cap">🖱️ Drag</span>
                </div>
                <span className="control-desc">Orbit View</span>
              </div>
            </>
          )}
        </div>

        <div className="card-footer">
          <span className="tip-badge">HINT</span>
          <span className="footer-text">
            Press <kbd className={`inline-kbd ${pressedKeys.has('C') ? 'pressed' : ''}`}>C</kbd> toggle UI • <kbd className={`inline-kbd ${pressedKeys.has('F') ? 'pressed' : ''}`}>F</kbd> Fullscreen
          </span>
        </div>
      </div>

      <div className={`placement-card glass-panel ${isPlacementOpen ? 'visible' : 'hidden'}`}>
        <div className="placement-header">
          <div>
            <h3>Model Placement</h3>
            <span>Drag the colored gizmo in the scene</span>
          </div>
          <button
            className="card-close-btn"
            onClick={() => handleTogglePlacement(false)}
            aria-label="Close Placement Editor"
            title="Close Placement Editor"
          >
            ✕
          </button>
        </div>

        <label className="placement-field">
          <span>Model</span>
          <select value={placementAsset} onChange={(event) => handlePlacementAsset(event.target.value)}>
            {PLACEMENT_ASSETS.map((asset) => (
              <option key={asset.path} value={asset.path}>
                {asset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="placement-mode-group" aria-label="Transform mode">
          {[
            ['translate', 'Move'],
            ['rotate', 'Rotate'],
            ['scale', 'Scale'],
          ].map(([mode, label]) => (
            <button
              key={mode}
              className={placementMode === mode ? 'active' : ''}
              onClick={() => handlePlacementMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="placement-actions">
          <button onClick={handleSnapPlacement}>Snap Ground</button>
          <button onClick={handleRefreshPlacement}>Read Values</button>
          <button onClick={handleCopyPlacement}>Copy Code</button>
        </div>

        <div className="placement-readout">
          <div>
            <span>Position</span>
            <code>
              x {placementSnapshot?.position.x ?? '0'} · y {placementSnapshot?.position.y ?? '0'} · z {placementSnapshot?.position.z ?? '0'}
            </code>
          </div>
          <div>
            <span>Rotation</span>
            <code>
              x {placementSnapshot?.rotation.x ?? '0'} · y {placementSnapshot?.rotation.y ?? '0'} · z {placementSnapshot?.rotation.z ?? '0'}
            </code>
          </div>
          <div>
            <span>Scale</span>
            <code>
              x {placementSnapshot?.scale.x ?? '1'} · y {placementSnapshot?.scale.y ?? '1'} · z {placementSnapshot?.scale.z ?? '1'}
            </code>
          </div>
        </div>

        <pre className="placement-code">{placementSnapshot?.code || '// Move the model, then press Read Values'}</pre>
        {copyStatus && <div className="placement-copy-status">{copyStatus}</div>}
      </div>

      {/* Floating Action Button (FAB) shown when panel is collapsed */}
      <button
        className={`fab-controls-btn glass-panel ${!isControlsOpen ? 'visible' : ''}`}
        onClick={() => setIsControlsOpen(true)}
        aria-label="Open Controls Panel"
        title="Open Controls Panel (C)"
      >
        <span className="fab-icon">🎮</span>
        <span className="fab-label">Controls</span>
        <span className="fab-badge">C</span>
      </button>
    </div>
  );
}
