import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
            const y = 36.94;
            const z = 88.35;

            outerGroup.rotation.set(0.000, -0.636, 0.000);
            outerGroup.scale.set(2.891, 2.150, 2.869);
            outerGroup.position.set(x, y, z);

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
        const y = 33.44;
        const z = 88.35;

        this.model.position.set(x, y, z);
    }
}
