import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MathUtils.js';

export class TreeStump {
    constructor(scene) {
        this.scene = scene;
        this.model = null;

        this.loadStumpModel();
    }

    loadStumpModel() {
        const loader = new GLTFLoader();
        loader.load('/stylized_tree_stump.glb', (gltf) => {
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

            const x = 11.66;
            const z = 88.35;

            outerGroup.rotation.set(0.000, -0.636, 0.000);
            outerGroup.scale.set(2.891, 2.150, 2.869);
            outerGroup.position.set(x, 0, z);

            this.model = outerGroup;
            this.scene.add(outerGroup);

            this.updatePosition();
        }, undefined, (err) => {
            console.warn('Error loading stylized_tree_stump.glb:', err);
        });
    }

    updatePosition() {
        if (!this.model) return;
        const x = 11.66;
        const z = 88.35;

        // Sample terrain height across the wide footprint of the stump (center + 4 corners)
        const r = 3.5;
        const heights = [
            getTerrainHeight(x, z),
            getTerrainHeight(x + r, z),
            getTerrainHeight(x - r, z),
            getTerrainHeight(x, z + r),
            getTerrainHeight(x, z - r),
        ];

        // Find the lowest ground level underneath the stump footprint
        const terrainY = Math.min(...heights);

        // Reset Y to 0 and force matrix update to calculate true geometry bounds
        this.model.position.set(x, 0, z);
        this.model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(this.model);
        const minY = box.min.y;

        // Firmly embed the stump deeper into the terrain (1.2m depth) so it sits flush without floating
        const embedDepth = 1.2;
        this.model.position.set(x, terrainY - minY - embedDepth, z);
    }
}
