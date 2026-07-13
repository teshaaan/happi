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
    particles.update(delta);
    fox.update(delta, elapsedTime);

    if (fox.mesh) {
        controls.target.copy(fox.mesh.position).add(foxTargetOffset);
    }

    controls.update();

    // Render using the composer for the bloom effect, not the standard renderer
    composer.render(); 
};

animate();

// --- 5. Resize Handling ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});