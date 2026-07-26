import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { Terrain } from './world/Terrain.js';
import { Environment } from './world/Environment.js';
import { ForestAssets } from './world/ForestAssets.js';
import { Pond } from './world/Pond.js';
import { ShrineStatue } from './world/ShrineStatue.js';
import { StylizedRock } from './world/StylizedRock.js';
import { TreeStump } from './world/TreeStump.js';
import { CherryTree } from './world/CherryTree.js';
import { MushroomPatch } from './world/MushroomPatch.js';
import { Particles } from './world/Particles.js';
import { LandmarkBlobs } from './world/LandmarkBlobs.js';
import { Fox } from './world/Fox.js';
import { Duck } from './world/Duck.js';
import { PlacementEditor } from './world/PlacementEditor.js';
import { getTerrainHeight } from './world/MathUtils.js';
import { preloadGLTF } from './world/AssetLoader.js';

export function initThreeScene(container) {
  // 1. Core Engine Setup
  const scene = new THREE.Scene();
  const getViewportSize = () => ({
    width: Math.max(1, container.clientWidth || window.innerWidth),
    height: Math.max(1, container.clientHeight || window.innerHeight)
  });
  const viewport = getViewportSize();
  const lowPowerDevice = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const maxPixelRatio = lowPowerDevice ? 1.1 : 1.45;
  const minPixelRatio = 0.85;
  let currentPixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
  let frameAvg = 1 / 60;
  let dprCheckElapsed = 0;

  const camera = new THREE.PerspectiveCamera(75, viewport.width / viewport.height, 0.1, 1000);
  camera.position.set(0, 8, 18);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(viewport.width, viewport.height);
  renderer.setPixelRatio(currentPixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Clear container & append canvas
  container.innerHTML = '';
  container.appendChild(renderer.domElement);
  preloadGLTF();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.rotateSpeed = 0.65;
  controls.minDistance = 4;
  controls.maxDistance = 55;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = 1.45;

  const foxTargetOffset = new THREE.Vector3(0, 1.6, 0);
  const duckTargetOffset = new THREE.Vector3(0, 1.2, 0);

  // 2. Post-Processing (Bloom)
  const usePostProcessing = !lowPowerDevice;
  const composer = usePostProcessing ? new EffectComposer(renderer) : null;
  if (composer) {
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(viewport.width, viewport.height), 0.28, 0.35, 0.94);
    composer.addPass(bloomPass);
  }

  // 3. World Instantiation
  const environment = new Environment(scene);
  const pond = new Pond(scene);
  const shrineStatue = new ShrineStatue(scene);
  const stylizedRock = new StylizedRock(scene);
  const treeStump = new TreeStump(scene);
  const cherryTree = new CherryTree(scene);
  const mushroomPatch = new MushroomPatch(scene);
  const forestAssets = new ForestAssets(scene);
  const particles = new Particles(scene, lowPowerDevice ? 450 : 800);
  const landmarkBlobs = new LandmarkBlobs(scene);
  const fox = new Fox(scene, camera);
  const duck = new Duck(scene, camera);
  const placementEditor = new PlacementEditor(scene, camera, renderer.domElement, controls);

  const snapAllToLandscape = () => {
    pond.updatePosition();
    shrineStatue.updatePosition();
    stylizedRock.updatePosition();
    treeStump.updatePosition();
    cherryTree.updatePosition();
    mushroomPatch.updatePosition();
    landmarkBlobs.updatePosition();
    fox.updateSpawnPosition();
    duck.updateSpawnPosition();
    updateSpatialAnchorsFromTerrain();
  };

  const terrain = new Terrain(scene, snapAllToLandscape);

  let activeCharacter = 'duck';
  fox.setActive(false);
  duck.setActive(true);

  const switchCharacter = (char) => {
    if (char === activeCharacter) return activeCharacter;
    if (char === 'fox') {
      activeCharacter = 'fox';
      fox.setActive(true);
      duck.setActive(false);
      camera.up.set(0, 1, 0);
    } else {
      activeCharacter = 'duck';
      fox.setActive(false);
      duck.setActive(true);
    }
    controls.enabled = true;
    return activeCharacter;
  };

  const toggleTheme = () => {
    if (environment.targetMode === 'night') {
      environment.targetMode = 'sunset';
      lastAutoMode = 'sunset';
      document.body.classList.add('sunset-active');
      return 'sunset';
    } else {
      environment.targetMode = 'night';
      lastAutoMode = 'night';
      document.body.classList.remove('sunset-active');
      return 'night';
    }
  };

  const setPlacementEditorEnabled = (enabled) => {
    placementEditor.setEnabled(enabled);
    return placementEditor.updateSnapshot();
  };

  const setPlacementAsset = (assetPath) => {
    placementEditor.loadAsset(assetPath);
    return placementEditor.updateSnapshot();
  };

  const setPlacementMode = (mode) => {
    placementEditor.setMode(mode);
    return placementEditor.updateSnapshot();
  };

  const snapPlacementToGround = () => {
    placementEditor.snapToGround();
    return placementEditor.updateSnapshot();
  };

  // 4. Proximity Detection System (POI & Shrine Mini-Quest)
  const proximityPos = new THREE.Vector3();
  const LANDMARKS = {
    rock: new THREE.Vector3(38.63, 0, -92.32),
    stump: new THREE.Vector3(11.66, 36.94, 88.35),
    cherry: new THREE.Vector3(83.73, 0, -53.62)
  };

  const SHRINE_LOCATIONS = [
    new THREE.Vector3(-60.99, 0, -41.00),
    new THREE.Vector3(-71.38, 0, -23.00),
    new THREE.Vector3(-50.60, 0, -23.00)
  ];

  const activatedShrines = [false, false, false];
  const shrineContactRadiusSq = 64.0;
  const shrineResetRadiusSq = 1225.0;
  let activePoi = null;

  const poiListeners = new Set();
  const shrineListeners = new Set();

  const notifyPoiListeners = (poi) => {
    poiListeners.forEach((fn) => fn(poi));
  };

  const notifyShrineListeners = () => {
    const count = activatedShrines.filter(Boolean).length;
    shrineListeners.forEach((fn) => fn({ count, total: 3, shrines: [...activatedShrines] }));
  };

  // 5. Animation Loop
  const clock = new THREE.Clock();
  let animId = null;
  const modeDuration = 120;
  let lastAutoMode = environment.targetMode;
  document.body.classList.add('sunset-active');

  const animate = () => {
    animId = requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsedTime = clock.getElapsedTime();
    frameAvg = frameAvg * 0.94 + delta * 0.06;
    dprCheckElapsed += delta;
    if (dprCheckElapsed > 1.0) {
      dprCheckElapsed = 0;
      const nativePixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
      let nextPixelRatio = currentPixelRatio;

      if (frameAvg > 1 / 42) {
        nextPixelRatio = Math.max(minPixelRatio, currentPixelRatio - 0.15);
      } else if (frameAvg < 1 / 57) {
        nextPixelRatio = Math.min(nativePixelRatio, currentPixelRatio + 0.1);
      }

      if (Math.abs(nextPixelRatio - currentPixelRatio) > 0.01) {
        currentPixelRatio = nextPixelRatio;
        renderer.setPixelRatio(currentPixelRatio);
        if (composer) {
          composer.setPixelRatio(currentPixelRatio);
        }
      }
    }

    const autoMode = Math.floor(elapsedTime / modeDuration) % 2 === 0 ? 'sunset' : 'night';
    if (autoMode !== lastAutoMode) {
      lastAutoMode = autoMode;
      environment.targetMode = autoMode;
      document.body.classList.toggle('sunset-active', autoMode === 'sunset');
    }
    
    terrain.update(delta);
    environment.update(delta);
    if (terrain.ocean) {
      terrain.ocean.setSunsetProgress(environment.transitionProgress);
    }
    pond.update(delta);

    if (elapsedTime < 3.0) {
      snapAllToLandscape();
    }

    cherryTree.update(delta);
    particles.update(delta);
    landmarkBlobs.update(delta);
    if (particles.material && particles.material.uniforms.uSunsetProgress) {
      particles.material.uniforms.uSunsetProgress.value = environment.transitionProgress;
    }

    duck.update(delta);
    shrineStatue.update(delta);

    if (duck.mesh) {
      controls.target.copy(duck.mesh.position).add(duckTargetOffset);
    }

    const activeMesh = activeCharacter === 'fox' ? fox.mesh : duck.mesh;
    if (activeMesh) {
      proximityPos.copy(activeMesh.position);
    } else {
      proximityPos.copy(camera.position);
    }

    const getDist2DSq = (targetPos) => {
      const dx = proximityPos.x - targetPos.x;
      const dz = proximityPos.z - targetPos.z;
      return dx * dx + dz * dz;
    };

    let detectedPoi = null;

    // 1. Stylized Rock -> LinkedIn (24m horizontal radius)
    if (getDist2DSq(LANDMARKS.rock) <= 576.0) {
      detectedPoi = 'linkedin';
    }
    // 2. Tree Stump -> GitHub (24m horizontal radius)
    else if (getDist2DSq(LANDMARKS.stump) <= 576.0) {
      detectedPoi = 'github';
    }
    // 3. Cherry Tree -> Portfolio (28m horizontal radius)
    else if (getDist2DSq(LANDMARKS.cherry) <= 784.0) {
      detectedPoi = 'portfolio';
    }

    // 4. Shrine Statues Mini-Quest (CV Link)
    let shrineUpdated = false;
    SHRINE_LOCATIONS.forEach((loc, idx) => {
      if (!activatedShrines[idx]) {
        if (getDist2DSq(loc) <= shrineContactRadiusSq) {
          activatedShrines[idx] = true;
          shrineStatue.activateShrine(idx);
          shrineUpdated = true;
        }
      }
    });

    const allShrinesActivated = activatedShrines.every(Boolean);
    if (allShrinesActivated) {
      const nearShrines = SHRINE_LOCATIONS.some((loc) => getDist2DSq(loc) <= shrineResetRadiusSq);
      if (nearShrines) {
        detectedPoi = 'cv';
      } else {
        activatedShrines.fill(false);
        shrineStatue.resetShrines();
        shrineUpdated = true;
      }
    }

    if (shrineUpdated) {
      notifyShrineListeners();
    }

    if (detectedPoi !== activePoi) {
      activePoi = detectedPoi;
      notifyPoiListeners(activePoi);
    }

    // Compute 3D Spatial World Anchors for In-World HTML Popups
    notifySpatialListeners();

    controls.update();

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  };

  const tmpProjVec = new THREE.Vector3();
  const SPATIAL_ANCHORS = {
    linkedin: new THREE.Vector3(38.63, 6.5, -92.32),
    github: new THREE.Vector3(11.66, 42.44, 88.35),
    portfolio: new THREE.Vector3(83.73, 9.3, -53.62),
    cv: new THREE.Vector3(-60.99, 42.7, -41.00)
  };

  const updateSpatialAnchorsFromTerrain = () => {
    SPATIAL_ANCHORS.linkedin.y = getTerrainHeight(38.63, -92.32) + 6.0;
    SPATIAL_ANCHORS.portfolio.y = getTerrainHeight(83.73, -53.62) + 8.5;
    SPATIAL_ANCHORS.cv.y = getTerrainHeight(-60.99, -41.00) + 7.5;
  };

  const spatialListeners = new Set();
  const notifySpatialListeners = () => {
    if (spatialListeners.size === 0) return;

    const data = {};
    for (const [key, anchor] of Object.entries(SPATIAL_ANCHORS)) {
      tmpProjVec.copy(anchor);
      tmpProjVec.project(camera);

      const screenX = (tmpProjVec.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-tmpProjVec.y * 0.5 + 0.5) * window.innerHeight;
      const isBehind = tmpProjVec.z > 1.0;
      const dist = camera.position.distanceTo(anchor);
      const distanceFactor = Math.min(Math.max(22.0 / Math.max(dist, 1.0), 0.45), 1.25);

      data[key] = {
        x: Math.round(screenX),
        y: Math.round(screenY),
        isBehind,
        distanceFactor: Number(distanceFactor.toFixed(3)),
        visible: activePoi === key
      };
    }

    spatialListeners.forEach((fn) => fn(data));
  };

  animate();

  // 6. Resize Listener
  const handleResize = () => {
    const { width, height } = getViewportSize();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    currentPixelRatio = Math.min(currentPixelRatio, Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    renderer.setPixelRatio(currentPixelRatio);
    renderer.setSize(width, height);
    if (composer) {
      composer.setSize(width, height);
    }
  };
  window.addEventListener('resize', handleResize);
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);

  return {
    switchCharacter,
    toggleTheme,
    setPlacementEditorEnabled,
    setPlacementAsset,
    setPlacementMode,
    snapPlacementToGround,
    getPlacementSnapshot: () => placementEditor.updateSnapshot(),
    getActiveCharacter: () => activeCharacter,
    getThemeMode: () => environment.targetMode,
    onPoiChange: (callback) => {
      poiListeners.add(callback);
      callback(activePoi);
      return () => poiListeners.delete(callback);
    },
    onSpatialPoiChange: (callback) => {
      spatialListeners.add(callback);
      return () => spatialListeners.delete(callback);
    },
    onShrineChange: (callback) => {
      shrineListeners.add(callback);
      const count = activatedShrines.filter(Boolean).length;
      callback({ count, total: 3, shrines: [...activatedShrines] });
      return () => shrineListeners.delete(callback);
    },
    triggerPoi: (poiType) => {
      activePoi = poiType;
      notifyPoiListeners(activePoi);
    },
    cleanup: () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('sunset-active');
      resizeObserver.disconnect();
      placementEditor.dispose();
      landmarkBlobs.dispose();
      if (composer) composer.dispose();
      renderer.dispose();
    }
  };
}
