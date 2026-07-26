import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MathUtils.js';

export const CAVE_DEN_POSITION = new THREE.Vector3(-22.0, 0, 18.0);

export class FoxDen {
    constructor(scene, position = CAVE_DEN_POSITION) {
        this.scene = scene;
        this.centerPos = position;
        
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.caveMesh = null;
        
        this.loadCaveModel();
    }

    loadCaveModel() {
        const loader = new GLTFLoader();
        loader.load('/low_poly_rock_cave.glb', (gltf) => {
            this.caveMesh = gltf.scene;

            // Compute raw bounding box to adjust scale necessarily (much bigger cave)
            const rawBounds = new THREE.Box3().setFromObject(this.caveMesh);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            
            // Set bigger target height (~26.0 units tall) so Fox (4.0 height) sits spacious inside
            const targetHeight = 26.0;
            const scaleFactor = targetHeight / Math.max(rawSize.y, 0.001);
            this.caveMesh.scale.setScalar(scaleFactor);

            // Re-compute bounds after scaling to align center and ground
            const scaledBounds = new THREE.Box3().setFromObject(this.caveMesh);
            const center = scaledBounds.getCenter(new THREE.Vector3());

            // Center X/Z and align bottom Y to ground 0
            this.caveMesh.position.x = -center.x;
            this.caveMesh.position.z = -center.z;
            this.caveMesh.position.y = -scaledBounds.min.y;

            // Natural slate-grey rock material for low-poly cave aesthetic
            const rockGreyMaterial = new THREE.MeshStandardMaterial({
                color: '#464d57',
                roughness: 0.88,
                metalness: 0.05,
                flatShading: true
            });

            // Enable shadows & apply dark rock grey material (NOT white)
            this.caveMesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = rockGreyMaterial;
                    // Do NOT call registerTerrainMesh(child) here, so getTerrainHeight raycast
                    // hits the landscape ground beneath the cave without feedback loop in the sky!
                }
            });

            this.group.add(this.caveMesh);

            // Add warm cozy interior lantern light spilling out of cave entrance
            const denLight = new THREE.PointLight('#ff9922', 6.0, 35);
            denLight.position.set(0, 4.0, 0);
            this.group.add(denLight);

            // Interior glow aura sprite
            const glowCanvas = document.createElement('canvas');
            glowCanvas.width = 128;
            glowCanvas.height = 128;
            const ctx = glowCanvas.getContext('2d');
            const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255, 170, 50, 0.95)');
            grad.addColorStop(0.5, 'rgba(255, 110, 20, 0.4)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 128, 128);

            const glowTex = new THREE.CanvasTexture(glowCanvas);
            const glowSprite = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: glowTex,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                })
            );
            glowSprite.position.set(0, 4.0, 2.0);
            glowSprite.scale.set(12, 12, 1);
            this.group.add(glowSprite);

            // Position firmly on ground terrain
            this.updatePosition();
        }, undefined, (err) => {
            console.warn('Error loading low_poly_rock_cave.glb:', err);
        });
    }

    updatePosition() {
        const terrainY = getTerrainHeight(this.centerPos.x, this.centerPos.z);
        this.group.position.set(this.centerPos.x, terrainY, this.centerPos.z);
    }
}
