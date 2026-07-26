import * as THREE from 'three';
import { loadGLTF } from './AssetLoader.js';
import { registerTerrainMesh } from './MathUtils.js';
import { Ocean } from './Ocean.js';
import { InvisibleBorder } from './InvisibleBorder.js';

export class Terrain {
    constructor(scene, onLoadCallback = null) {
        this.scene = scene;
        this.onLoadCallback = onLoadCallback;
        this.landscapeGroup = new THREE.Group();
        this.scene.add(this.landscapeGroup);

        // 1. Low-Poly ocean water surrounding the island
        this.ocean = new Ocean(this.scene, 1400, -0.4);

        // 2. Invisible Border Wall around the island
        this.invisibleBorder = new InvisibleBorder(this.scene, 160.0);

        // 3. Load 3D landscape model
        this.loadLandscape();
    }

    loadLandscape() {
        loadGLTF('/landscape.glb', (gltf) => {
            const landscape = gltf.scene;

            const rawBounds = new THREE.Box3().setFromObject(landscape);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            const maxDim = Math.max(rawSize.x, rawSize.z);
            
            const targetSpan = 360;
            const scaleFactor = targetSpan / Math.max(maxDim, 0.001);
            landscape.scale.setScalar(scaleFactor);

            const scaledBounds = new THREE.Box3().setFromObject(landscape);
            const center = scaledBounds.getCenter(new THREE.Vector3());
            landscape.position.x -= center.x;
            landscape.position.z -= center.z;
            landscape.position.y -= scaledBounds.min.y;

            // Ensure landscape and all children matrices are updated before raycasting registration
            landscape.updateMatrixWorld(true);

            landscape.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.roughness = 0.85;
                        child.material.metalness = 0.05;
                    }
                    // Register all 3D landscape surface meshes so characters walk on top of hills, mountains, and paths
                    registerTerrainMesh(child);
                }
            });

            this.landscapeGroup.add(landscape);
            this.landscapeGroup.updateMatrixWorld(true);

            if (this.onLoadCallback) {
                this.onLoadCallback();
            }
        }, undefined, (err) => {
            console.warn('Error loading landscape.glb:', err);
        });
    }

    update(delta) {
        if (this.ocean) {
            this.ocean.update(delta);
        }
    }
}