import * as THREE from 'three';
import { loadGLTF } from './AssetLoader.js';
import { getTerrainHeight } from './MathUtils.js';

export class StylizedRock {
    constructor(scene) {
        this.scene = scene;
        this.model = null;

        this.loadRockModel();
    }

    loadRockModel() {
        loadGLTF('/stylized_rock_01.glb', (gltf) => {
            const rawModel = gltf.scene;

            // 1. Normalize height scale to match PlacementEditor structure
            const rawBounds = new THREE.Box3().setFromObject(rawModel);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            const targetHeight = Math.min(Math.max(rawSize.y, 3), 10);
            const normScale = targetHeight / Math.max(rawSize.y, 0.001);
            rawModel.scale.setScalar(normScale);

            // 2. Enable shadows & lighting response
            rawModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // 3. Center pivot & align ground bottom to match PlacementEditor
            const bounds = new THREE.Box3().setFromObject(rawModel);
            const center = bounds.getCenter(new THREE.Vector3());
            rawModel.position.x -= center.x;
            rawModel.position.z -= center.z;
            rawModel.position.y -= bounds.min.y;

            // 4. Create outer transform group to hold exact editor transforms
            const outerGroup = new THREE.Group();
            outerGroup.add(rawModel);

            const x = 38.63;
            const z = -92.32;

            outerGroup.rotation.set(0.000, -1.243, 0.000);
            outerGroup.scale.set(2.653, 2.653, 2.653);
            outerGroup.position.set(x, 0, z);

            this.model = outerGroup;
            this.scene.add(outerGroup);

            this.updatePosition();
        }, undefined, (err) => {
            console.warn('Error loading stylized_rock_01.glb:', err);
        });
    }

    updatePosition() {
        if (!this.model) return;
        const x = 38.63;
        const z = -92.32;
        const terrainY = getTerrainHeight(x, z);

        // Reset Y to 0 and force matrix update to calculate true geometry bounds
        this.model.position.set(x, 0, z);
        this.model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(this.model);
        const minY = box.min.y;

        // Ground rock bottom flush onto terrain surface (embedded by 0.25 for seamless fit)
        const embedDepth = 0.25;
        this.model.position.set(x, terrainY - minY - embedDepth, z);
    }
}
