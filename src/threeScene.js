import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { Terrain } from './world/Terrain.js';
import { Environment } from './world/Environment.js';
import { ForestAssets } from './world/ForestAssets.js';
import { Pond } from './world/Pond.js';
import { FoxDen } from './world/FoxDen.js';
import { Particles } from './world/Particles.js';
import { Fox } from './world/Fox.js';
import { Duck } from './world/Duck.js';

export function initThreeScene(container) {
  // 1. Core Engine Setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 18);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Clear container & append canvas
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

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
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.1, 0.45, 0.85);
  composer.addPass(bloomPass);

  // 3. World Instantiation
  const environment = new Environment(scene);
  const pond = new Pond(scene);
  const foxDen = new FoxDen(scene);
  const forestAssets = new ForestAssets(scene);
  const particles = new Particles(scene, 4000);
  const fox = new Fox(scene, camera);
  const duck = new Duck(scene, camera);

  const snapAllToLandscape = () => {
    pond.updatePosition();
    foxDen.updatePosition();
    fox.updateSpawnPosition();
    duck.updateSpawnPosition();
  };

  const terrain = new Terrain(scene, snapAllToLandscape);

  let activeCharacter = 'fox';
  fox.setActive(true);
  duck.setActive(false);

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
      environment.targetMode = 'morning';
      document.body.classList.add('morning-active');
      return 'morning';
    } else {
      environment.targetMode = 'night';
      document.body.classList.remove('morning-active');
      return 'night';
    }
  };

  // 4. Animation Loop
  const clock = new THREE.Clock();
  let animId = null;

  const animate = () => {
    animId = requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsedTime = clock.getElapsedTime();
    
    terrain.update(delta);
    environment.update(delta);
    pond.update(delta);

    if (elapsedTime < 3.0) {
      snapAllToLandscape();
    }

    particles.update(delta);
    if (particles.material && particles.material.uniforms.uMorningProgress) {
      particles.material.uniforms.uMorningProgress.value = environment.transitionProgress;
    }

    fox.update(delta, elapsedTime);
    duck.update(delta);

    if (activeCharacter === 'fox') {
      if (fox.mesh) {
        controls.target.copy(fox.mesh.position).add(foxTargetOffset);
      }
    } else {
      if (duck.mesh) {
        controls.target.copy(duck.mesh.position).add(duckTargetOffset);
      }
    }
    controls.update();

    composer.render();
  };

  animate();

  // 5. Resize Listener
  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', handleResize);

  return {
    switchCharacter,
    toggleTheme,
    getActiveCharacter: () => activeCharacter,
    getThemeMode: () => environment.targetMode,
    cleanup: () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    }
  };
}
