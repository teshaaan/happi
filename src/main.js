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
import { CameraController } from './world/CameraController.js';

// --- 1. Core Engine Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 2, 0);

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
const fox = new Fox(scene);

// We define this here, but instantiate it in the loop once the Fox is loaded
let cameraController = null;

// --- 4. Animation Loop ---
const clock = new THREE.Clock();

const animate = () => {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta(); 
    const elapsedTime = clock.getElapsedTime(); // Required for terrain/fox Y-axis sync
    
    // Initialize the camera controller only after the Fox GLTF has loaded asynchronously
    if (fox.mesh && !cameraController) {
        cameraController = new CameraController(camera, fox.mesh);
    }
    
    // Update all systems
    terrain.update(delta); 
    particles.update(delta);
    fox.update(delta, elapsedTime);
    
    if (cameraController) {
        cameraController.update(delta);
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