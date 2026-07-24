import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Post-Processing
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// World Modules
import { Terrain } from './world/Terrain.js';
import { Environment } from './world/Environment.js';
import { ForestAssets } from './world/ForestAssets.js';
import { Pond } from './world/Pond.js';
import { FoxDen } from './world/FoxDen.js';
import { Particles } from './world/Particles.js';
import { Fox } from './world/Fox.js';
import { Duck } from './world/Duck.js';

// --- 1. Core Engine Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

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

// --- 2. Post-Processing (Bloom) ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// UnrealBloomPass(Resolution, Strength, Radius, Threshold)
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.1, 0.45, 0.85);
composer.addPass(bloomPass);

// --- 3. World Instantiation ---
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

// --- 4. Character Switching Logic & UI Integration ---
let activeCharacter = 'fox';

const selectFoxBtn = document.getElementById('select-fox');
const selectDuckBtn = document.getElementById('select-duck');
const controlsTitle = document.getElementById('controls-title');
const controlsList = document.getElementById('controls-list');

const foxControlsHTML = `
  <div class="control-item">
    <span class="key-cap">W</span>
    <span class="key-cap">A</span>
    <span class="key-cap">S</span>
    <span class="key-cap">D</span>
    <span class="control-desc">Move ground</span>
  </div>
  <div class="control-item">
    <span class="key-cap">Space</span>
    <span class="control-desc">Jump</span>
  </div>
  <div class="control-item font-subtle">
    <span class="key-cap">T</span>
    <span class="control-desc">Switch character</span>
  </div>
`;

const duckControlsHTML = `
  <div class="control-item">
    <span class="key-cap">W</span>
    <span class="key-cap">A</span>
    <span class="key-cap">S</span>
    <span class="key-cap">D</span>
    <span class="control-desc">Move (Grounded/Airborne)</span>
  </div>
  <div class="control-item">
    <span class="key-cap">Space</span>
    <span class="control-desc">Jump (Ground) / Flap (Air)</span>
  </div>
  <div class="control-item font-subtle">
    <span class="key-cap">T</span>
    <span class="control-desc">Switch character</span>
  </div>
`;

const switchCharacter = (char) => {
    if (char === activeCharacter) return;
    
    if (char === 'fox') {
        activeCharacter = 'fox';
        fox.setActive(true);
        duck.setActive(false);
        
        // Reset camera Up to prevent any leftover roll from flight
        camera.up.set(0, 1, 0);

        // Update UI
        if (selectFoxBtn) selectFoxBtn.classList.add('active');
        if (selectDuckBtn) selectDuckBtn.classList.remove('active');
        if (controlsTitle) controlsTitle.innerHTML = '🦊 Fox Controls';
        if (controlsList) controlsList.innerHTML = foxControlsHTML;
    } else {
        activeCharacter = 'duck';
        fox.setActive(false);
        duck.setActive(true);

        // Update UI
        if (selectFoxBtn) selectFoxBtn.classList.remove('active');
        if (selectDuckBtn) selectDuckBtn.classList.add('active');
        if (controlsTitle) controlsTitle.innerHTML = '🦆 Duck Flight';
        if (controlsList) controlsList.innerHTML = duckControlsHTML;
    }
    
    // Smoothly reset camera to orbit mode controls
    controls.enabled = true;
};

// UI click listeners
if (selectFoxBtn) selectFoxBtn.addEventListener('click', () => switchCharacter('fox'));
if (selectDuckBtn) selectDuckBtn.addEventListener('click', () => switchCharacter('duck'));

// Keyboard T listener to switch character
window.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') {
        if (activeCharacter === 'fox') {
            switchCharacter('duck');
        } else {
            switchCharacter('fox');
        }
    }
});

// Set initial states
fox.setActive(true);
duck.setActive(false);

// --- 5. Animation Loop ---
const clock = new THREE.Clock();

const animate = () => {
    requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1); // Cap delta to prevent physics glitches when tabbed out
    const elapsedTime = clock.getElapsedTime(); // Required for terrain/fox Y-axis sync
    
    // Update all systems
    terrain.update(delta); 
    environment.update(delta);
    pond.update(delta);

    // Ensure positions snap to terrain as landscape finishes loading
    if (elapsedTime < 3.0) {
        snapAllToLandscape();
    }

    // Update fireflies and fade them out in morning mode
    particles.update(delta);
    if (particles.material && particles.material.uniforms.uMorningProgress) {
        particles.material.uniforms.uMorningProgress.value = environment.transitionProgress;
    }

    // Always update both meshes to run idle/move animations
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

    // Render using the composer for the bloom effect, not the standard renderer
    composer.render(); 
};

animate();

// --- 5. Theme Toggle Logic ---
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    const themeLabel = themeToggleBtn.querySelector('.theme-label');
    const toggleThumb = themeToggleBtn.querySelector('.toggle-thumb');

    themeToggleBtn.addEventListener('click', () => {
        if (environment.targetMode === 'night') {
            environment.targetMode = 'morning';
            document.body.classList.add('morning-active');
            if (themeLabel) themeLabel.textContent = 'Morning';
            if (toggleThumb) spinThumb('☀️');
        } else {
            environment.targetMode = 'night';
            document.body.classList.remove('morning-active');
            if (themeLabel) themeLabel.textContent = 'Night';
            if (toggleThumb) spinThumb('🌙');
        }
    });

    const spinThumb = (emoji) => {
        toggleThumb.style.transition = 'transform 0.15s ease-in, opacity 0.15s ease-in';
        toggleThumb.style.transform = 'scale(0.2) rotate(180deg)';
        toggleThumb.style.opacity = '0';
        setTimeout(() => {
            toggleThumb.textContent = emoji;
            toggleThumb.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s';
            toggleThumb.style.transform = 'scale(1) rotate(360deg)';
            toggleThumb.style.opacity = '1';
        }, 150);
    };
}

// --- 6. Resize Handling ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});