import * as THREE from 'three';
import { loadGLTF } from './AssetLoader.js';
import { getTerrainHeight } from './MathUtils.js';
import { globalTelemetry } from '../services/telemetryService.js';

export const CAVE_DEN_POSITION = new THREE.Vector3(-39.56, 0, 29.95);

export class FoxDen {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.visible = true; // Visible rock cave asset

        globalTelemetry.recordEvent('foxden_construct', { x: CAVE_DEN_POSITION.x, z: CAVE_DEN_POSITION.z });
        this.loadCaveModel();
    }

    setVisible(visible) {
        this.visible = visible;
        if (this.model) {
            this.model.visible = visible;
        }
    }

    loadCaveModel() {
        loadGLTF('/low_poly_rock_cave.glb', (gltf) => {
            const rawModel = gltf.scene;

            // 1. Normalize height scale to match PlacementEditor preparation
            const rawBounds = new THREE.Box3().setFromObject(rawModel);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            const targetHeight = Math.min(Math.max(rawSize.y, 3), 10);
            const normScale = targetHeight / Math.max(rawSize.y, 0.001);
            rawModel.scale.setScalar(normScale);

            // 2. Apply grey material with DoubleSide so cave interior/exterior render cleanly
            const rockGreyMaterial = new THREE.MeshStandardMaterial({
                color: '#5e6670',
                roughness: 0.88,
                metalness: 0.08,
                flatShading: true,
                side: THREE.DoubleSide
            });

            rawModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = rockGreyMaterial;
                }
            });

            // 3. Center pivot & align ground bottom to match PlacementEditor
            const bounds = new THREE.Box3().setFromObject(rawModel);
            const center = bounds.getCenter(new THREE.Vector3());
            rawModel.position.x -= center.x;
            rawModel.position.z -= center.z;
            rawModel.position.y -= bounds.min.y;

            // 4. Create outer transform group to hold editor position/rotation/scale
            const outerGroup = new THREE.Group();
            outerGroup.add(rawModel);

            const x = -39.56;
            const z = 29.95;
            const terrainY = getTerrainHeight(x, z);

            outerGroup.position.set(x, terrainY, z);
            outerGroup.rotation.set(-3.109, -0.272, -3.002);
            outerGroup.scale.set(2.290, 2.164, 2.980);
            outerGroup.visible = this.visible;

            this.model = outerGroup;
            this.scene.add(outerGroup);

            this.updatePosition();
        }, undefined, (err) => {
            console.warn('Error loading low_poly_rock_cave.glb:', err);
        });
    }

    updatePosition() {
        if (!this.model) return;
        const x = CAVE_DEN_POSITION.x;
        const z = CAVE_DEN_POSITION.z;
        const terrainY = getTerrainHeight(x, z);

        // Reset Y to 0 and force matrix update to calculate true geometry bounds after rotation/scale
        this.model.position.set(x, 0, z);
        this.model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(this.model);
        const minY = box.min.y;

        // Anchor lowest point of the cave geometry flush with terrainY (embedded by 0.3 for seamless ground fit)
        const embedDepth = 0.3;
        this.model.position.y = terrainY - minY - embedDepth;
    }
}
