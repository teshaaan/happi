import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MathUtils.js';

export const SHRINE_POSITIONS = [
    { x: -60.99, z: -41.00, rotY: 0.0 },
    { x: -71.38, z: -23.00, rotY: 2.094 },
    { x: -50.60, z: -23.00, rotY: -2.094 }
];

export class ShrineStatue {
    constructor(scene) {
        this.scene = scene;
        this.models = [];
        this.container = new THREE.Group();
        this.scene.add(this.container);

        this.loadShrineModel();
    }

    loadShrineModel() {
        const loader = new GLTFLoader();
        loader.load('/shinto_style_statueshrine.glb', (gltf) => {
            const templateModel = gltf.scene;

            // 1. Normalize height scale to match PlacementEditor structure
            const rawBounds = new THREE.Box3().setFromObject(templateModel);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            const targetHeight = Math.min(Math.max(rawSize.y, 3), 10);
            const normScale = targetHeight / Math.max(rawSize.y, 0.001);
            templateModel.scale.setScalar(normScale);

            // 2. Enable shadows & lighting response
            templateModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // 3. Center pivot & align ground bottom to match PlacementEditor
            const bounds = new THREE.Box3().setFromObject(templateModel);
            const center = bounds.getCenter(new THREE.Vector3());
            templateModel.position.x -= center.x;
            templateModel.position.z -= center.z;
            templateModel.position.y -= bounds.min.y;

            // 4. Create 3 shrine statues forming an equilateral triangle formation
            SHRINE_POSITIONS.forEach((posConfig) => {
                const instanceMesh = templateModel.clone(true);
                const outerGroup = new THREE.Group();
                outerGroup.add(instanceMesh);

                outerGroup.rotation.set(0, posConfig.rotY, 0);
                outerGroup.scale.set(1.115, 1.064, 1.000);

                this.models.push({ group: outerGroup, config: posConfig });
                this.container.add(outerGroup);
            });

            this.updatePosition();
        }, undefined, (err) => {
            console.warn('Error loading shinto_style_statueshrine.glb:', err);
        });
    }

    updatePosition() {
        if (!this.models || this.models.length === 0) return;

        this.models.forEach(({ group, config }) => {
            const x = config.x;
            const z = config.z;
            const terrainY = getTerrainHeight(x, z);

            // Calculate true bounding box min Y after rotation and scale
            group.position.set(x, 0, z);
            group.updateMatrixWorld(true);

            const box = new THREE.Box3().setFromObject(group);
            const minY = box.min.y;

            // Ground base flush on terrain surface (embedded by 0.15 for smooth fit)
            const embedDepth = 0.15;
            group.position.set(x, terrainY - minY - embedDepth, z);
        });
    }
}
