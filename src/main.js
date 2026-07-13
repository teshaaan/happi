import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Post-Processing
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// World Modules
import { Terrain } from './world/Terrain.js';
import { Environment } from './world/Environment.js';
import { Particles } from './world/Particles.js';
import { Fox } from './world/Fox.js';

// --- 1. Core Engine Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 14);

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
controls.minDistance = 6;
controls.maxDistance = 24;
controls.minPolarAngle = 0.3;
controls.maxPolarAngle = 1.35;

const foxTargetOffset = new THREE.Vector3(0, 1.6, 0);

// --- 2. Post-Processing (Bloom) ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// UnrealBloomPass(Resolution, Strength, Radius, Threshold)
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.5, 0.85);
composer.addPass(bloomPass);

// --- 3. World Instantiation ---
const environment = new Environment(scene);
const terrain = new Terrain();
scene.add(terrain.mesh);
const particles = new Particles(scene, 2000);
const fox = new Fox(scene, camera);

// We define this here, but instantiate it in the loop once the Fox is loaded
// --- 4. Animation Loop ---
const clock = new THREE.Clock();

const animate = () => {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta(); 
    const elapsedTime = clock.getElapsedTime(); // Required for terrain/fox Y-axis sync
    
    // Update all systems
    terrain.update(delta); 
    environment.update(delta);

    // Update fireflies and fade them out in morning mode
    particles.update(delta);
    if (particles.material && particles.material.uniforms.uMorningProgress) {
        particles.material.uniforms.uMorningProgress.value = environment.transitionProgress;
    }

    fox.update(delta, elapsedTime);

    if (fox.mesh) {
        controls.target.copy(fox.mesh.position).add(foxTargetOffset);
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