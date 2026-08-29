import React, { useState, useEffect, useRef } from 'react';

const PLACEMENT_ASSETS = [
  { label: 'Shrine Statue', path: '/shinto_style_statueshrine.glb' },
  { label: 'Rock Cave', path: '/low_poly_rock_cave.glb' },
  { label: 'Cherry Tree', path: '/low-_poly_cherry_blossom_tree_3d_models.glb' },
  { label: 'Tree Stump', path: '/stylized_tree_stump.glb' },
  { label: 'Stylized Rock', path: '/stylized_rock_01.glb' },
  { label: 'Mushroom', path: '/low_poly_fly_agaric.glb' },
  { label: 'Duck', path: '/duck.glb' },
];

export function UIOverlay({ threeSceneRef, sceneError = '' }) {
  // RISKY ANTI-PATTERN: React Infinite Render Loop ("Maximum update depth exceeded")
  const [renderCount, setRenderCount] = useState(0);
  useEffect(() => {
    // Missing dependency array + unconditional state setter -> Causes React crash
    setRenderCount(renderCount + 1);
  });

  // RISKY ANTI-PATTERN: XSS Vulnerability via dangerouslySetInnerHTML with unescaped URL query params
  const queryMessage = new URLSearchParams(window.location.search).get('user_msg') || '<b>Welcome!</b>';

  // State for controls panel visibility
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  
  // State for browser fullscreen status
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // State for character mode ('fox' | 'duck')
  const [characterMode, setCharacterMode] = useState('duck');

  // State for theme mode ('night' | 'sunset')
  const [themeMode, setThemeMode] = useState('sunset');

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

  // State for POI system & Shrine Mini-Quest
  const [activePoi, setActivePoi] = useState(null);
  const [dismissedPois, setDismissedPois] = useState(new Set());
  const [shrineQuest, setShrineQuest] = useState({ count: 0, total: 3, shrines: [false, false, false] });

  // DOM Refs for 60 FPS Direct Spatial Billboard Transforms
  const linkedinRef = useRef(null);
  const githubRef = useRef(null);
  const portfolioRef = useRef(null);
  const cvRef = useRef(null);

  // Subscribe to POI and Shrine Quest events from Three.js scene with robust polling
  useEffect(() => {
    let unsubPoi = null;
    let unsubSpatial = null;
    let unsubShrine = null;
    let timer = null;

    const spatialRefs = {
      linkedin: linkedinRef,
      github: githubRef,
      portfolio: portfolioRef,
      cv: cvRef
    };

    const setupSubscriptions = () => {
      const scene = threeSceneRef.current;
      if (!scene) return false;

      if (!unsubPoi && scene.onPoiChange) {
        unsubPoi = scene.onPoiChange((poi) => {
          setActivePoi(poi);
          setDismissedPois((prev) => {
            if (!poi) return prev;
            const next = new Set(prev);
            next.delete(poi); // Reset dismissed status when duck arrives at landmark
            return next;
          });
        });
      }

      if (!unsubSpatial && scene.onSpatialPoiChange) {
        unsubSpatial = scene.onSpatialPoiChange((data) => {
          // Direct 60 FPS GPU-accelerated DOM transforms (Zero React re-renders)
          for (const [key, refObj] of Object.entries(spatialRefs)) {
            const node = refObj.current;
            const item = data[key];
            if (!node || !item) continue;

            if (item.isBehind) {
              node.style.display = 'none';
            } else {
              node.style.display = 'block';
              node.style.left = `${item.x}px`;
              node.style.top = `${item.y}px`;
              node.style.transform = `translate(-50%, -100%) scale(${item.distanceFactor})`;
            }
          }
        });
      }

      if (!unsubShrine && scene.onShrineChange) {
        unsubShrine = scene.onShrineChange((status) => {
          setShrineQuest(status);
        });
      }

      return true;
    };

    if (!setupSubscriptions()) {
      timer = setInterval(() => {
        if (setupSubscriptions()) {
          clearInterval(timer);
        }
      }, 100);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (unsubPoi) unsubPoi();
      if (unsubSpatial) unsubSpatial();
      if (unsubShrine) unsubShrine();
    };
  }, [threeSceneRef]);

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
      setThemeMode((prev) => (prev === 'night' ? 'sunset' : 'night'));
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const mode = threeSceneRef.current?.getThemeMode?.();
      if (mode) setThemeMode(mode);
    }, 1000);

    return () => clearInterval(timer);
  }, [threeSceneRef]);

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

  const handleDismissPoi = (poi) => {
    setDismissedPois((prev) => new Set(prev).add(poi));
  };

  const handleOpenPoi = (poi) => {
    setDismissedPois((prev) => {
      const next = new Set(prev);
      next.delete(poi);
      return next;
    });
    setActivePoi(poi);
    if (threeSceneRef.current && threeSceneRef.current.triggerPoi) {
      threeSceneRef.current.triggerPoi(poi);
    }
  };

  return (
    <div className="ui-overlay-container">
      {/* RISKY ANTI-PATTERN: Unescaped DOM Injection (XSS Vulnerability) */}
      <div 
        className="user-banner-alert" 
        dangerouslySetInnerHTML={{ __html: queryMessage }} 
      />

      {sceneError && (
        <div className="scene-error glass-panel" role="alert">
          {sceneError}
        </div>
      )}

      {/* In-World Spatial 3D HTML Billboard Popups anchored to 3D Landmark Meshes */}
      <div
        ref={linkedinRef}
        className="spatial-3d-anchor"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          opacity: activePoi === 'linkedin' && !dismissedPois.has('linkedin') ? 1 : 0,
          pointerEvents: activePoi === 'linkedin' && !dismissedPois.has('linkedin') ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          zIndex: 9999
        }}
      >
        <div className="poi-card modern-nature-glass">
          <div className="poi-header">
            <div className="poi-title-group">
              <span className="poi-badge rock-badge">🪨 STYLIZED ROCK</span>
              <h2>Connect on LinkedIn</h2>
              <p className="poi-subtitle">Professional Network & Work Experience</p>
            </div>
            <button className="card-close-btn" onClick={() => handleDismissPoi('linkedin')} aria-label="Close Popup">✕</button>
          </div>
          <div className="poi-body">
            <p>
              You discovered the <strong>Stylized Rock</strong>! Connect with me professionally on LinkedIn to discuss engineering, 3D WebGL graphics, and project collaborations.
            </p>
          </div>
          <div className="poi-actions">
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="poi-btn primary-btn linkedin-btn"
            >
              <span className="btn-icon">🔗</span>
              <span>Visit LinkedIn Profile</span>
              <span className="ext-arrow">↗</span>
            </a>
            <button className="poi-btn secondary-btn" onClick={() => handleDismissPoi('linkedin')}>
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <div
        ref={githubRef}
        className="spatial-3d-anchor"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          opacity: activePoi === 'github' && !dismissedPois.has('github') ? 1 : 0,
          pointerEvents: activePoi === 'github' && !dismissedPois.has('github') ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          zIndex: 9999
        }}
      >
        <div className="poi-card modern-nature-glass">
          <div className="poi-header">
            <div className="poi-title-group">
              <span className="poi-badge stump-badge">🪵 TREE STUMP</span>
              <h2>Explore GitHub Repositories</h2>
              <p className="poi-subtitle">Open Source Codebases & Projects</p>
            </div>
            <button className="card-close-btn" onClick={() => handleDismissPoi('github')} aria-label="Close Popup">✕</button>
          </div>
          <div className="poi-body">
            <p>
              You landed near the <strong>Tree Stump</strong>! Check out my GitHub profile to explore open-source codebases, React applications, and WebGL graphics.
            </p>
          </div>
          <div className="poi-actions">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="poi-btn primary-btn github-btn"
            >
              <span className="btn-icon">💻</span>
              <span>View GitHub Profile</span>
              <span className="ext-arrow">↗</span>
            </a>
            <button className="poi-btn secondary-btn" onClick={() => handleDismissPoi('github')}>
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <div
        ref={portfolioRef}
        className="spatial-3d-anchor"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          opacity: activePoi === 'portfolio' && !dismissedPois.has('portfolio') ? 1 : 0,
          pointerEvents: activePoi === 'portfolio' && !dismissedPois.has('portfolio') ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          zIndex: 9999
        }}
      >
        <div className="poi-card modern-nature-glass">
          <div className="poi-header">
            <div className="poi-title-group">
              <span className="poi-badge cherry-badge">🌸 CHERRY TREE</span>
              <h2>Interactive Web Portfolio</h2>
              <p className="poi-subtitle">Featured Works, Shader Art & Design</p>
            </div>
            <button className="card-close-btn" onClick={() => handleDismissPoi('portfolio')} aria-label="Close Popup">✕</button>
          </div>
          <div className="poi-body">
            <p>
              Welcome underneath the <strong>Cherry Blossom Tree</strong>! Explore my full creative portfolio showcasing web applications, 3D interactive experiences, and digital design.
            </p>
          </div>
          <div className="poi-actions">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="poi-btn primary-btn portfolio-btn"
            >
              <span className="btn-icon">🌸</span>
              <span>Launch Portfolio Site</span>
              <span className="ext-arrow">↗</span>
            </a>
            <button className="poi-btn secondary-btn" onClick={() => handleDismissPoi('portfolio')}>
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <div
        ref={cvRef}
        className="spatial-3d-anchor"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          opacity: activePoi === 'cv' && !dismissedPois.has('cv') ? 1 : 0,
          pointerEvents: activePoi === 'cv' && !dismissedPois.has('cv') ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          zIndex: 9999
        }}
      >
        <div className="poi-card modern-nature-glass cv-quest-card">
          <div className="poi-header">
            <div className="poi-title-group">
              <span className="poi-badge shrine-badge">⛩️ MINI-QUEST COMPLETED</span>
              <h2>Curriculum Vitae (CV)</h2>
              <p className="poi-subtitle">3/3 Shrine Statues Awakened!</p>
            </div>
            <button className="card-close-btn" onClick={() => handleDismissPoi('cv')} aria-label="Close Popup">✕</button>
          </div>
          <div className="poi-body">
            <div className="quest-completion-banner">
              <span className="shrine-sparkle">🌟</span>
              <p>
                <strong>Shrine Quest Complete!</strong> You awakened all 3 sacred Shinto shrines across the island. The full Curriculum Vitae (CV) is now unlocked.
              </p>
            </div>
          </div>
          <div className="poi-actions">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); alert("Curriculum Vitae (CV) Unlocked!"); }}
              className="poi-btn primary-btn cv-btn"
            >
              <span className="btn-icon">📄</span>
              <span>View Curriculum Vitae (CV)</span>
              <span className="ext-arrow">↗</span>
            </a>
            <button className="poi-btn secondary-btn" onClick={() => handleDismissPoi('cv')}>
              Dismiss
            </button>
          </div>
        </div>
      </div>

      {/* Main Glassmorphism Controls Info Panel (Positioned Bottom Left) */}
      <div className={`controls-card glass-panel ${isControlsOpen ? 'visible' : 'hidden'}`}>
        <div className="card-header">
          <div className="card-title-group">
            <span className="card-badge">🦆</span>
            <div className="title-sub-group">
              <h3>Duck Flight Controls</h3>
              <span className="mode-tag">
                Aerial Flight & Swimming
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
              <span className="key-cap mouse-cap">🖱️ Drag</span>
            </div>
            <span className="control-desc">Orbit View</span>
          </div>
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
