import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MathUtils.js';

export class MushroomPatch {
    constructor(scene) {
        this.scene = scene;
        this.models = [];
        this.container = new THREE.Group();
        this.scene.add(this.container);

        this.loadMushroomModel();
    }

    loadMushroomModel() {
        const loader = new GLTFLoader();
        loader.load('/low_poly_fly_agaric.glb', (gltf) => {
            const templateModel = gltf.scene;

            // 1. Normalize raw GLTF model to a 1.3m baseline height
            const rawBounds = new THREE.Box3().setFromObject(templateModel);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            const targetHeight = 1.3;
            const normScale = targetHeight / Math.max(rawSize.y, 0.001);
            templateModel.scale.setScalar(normScale);

            // 2. Enable shadows & lighting response
            templateModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // 3. Center pivot & align ground bottom
            const bounds = new THREE.Box3().setFromObject(templateModel);
            const center = bounds.getCenter(new THREE.Vector3());
            templateModel.position.x -= center.x;
            templateModel.position.z -= center.z;
            templateModel.position.y -= bounds.min.y;

            // 4. Subtle placement: 18 mushrooms placed only in quiet island corners and outer edges (away from pond, shrines, rocks, stump, cherry tree)
            const cornerSpots = [
                { px: -110, pz: -65 },
                { px: -105, pz: 55 },
                { px: 115, pz: 75 },
                { px: -75, pz: 110 },
                { px: 65, pz: 120 },
                { px: -125, pz: 10 }
            ];

            const userScale = new THREE.Vector3(0.559, 0.704, 0.546);

            cornerSpots.forEach(spot => {
                // 3 small mushrooms per corner spot
                for (let i = 0; i < 3; i++) {
                    const offsetX = (Math.random() - 0.5) * 3.5;
                    const offsetZ = (Math.random() - 0.5) * 3.5;
                    this.createSingleMushroom(templateModel, userScale, spot.px + offsetX, spot.pz + offsetZ);
                }
            });

            this.updatePosition();
        }, undefined, (err) => {
            console.warn('Error loading low_poly_fly_agaric.glb:', err);
        });
    }

    createSingleMushroom(templateModel, userScale, px, pz) {
        const instance = templateModel.clone(true);
        const outerGroup = new THREE.Group();
        outerGroup.add(instance);

        const varFactor = 0.75 + Math.random() * 0.4;
        outerGroup.scale.set(
            userScale.x * varFactor,
            userScale.y * varFactor,
            userScale.z * varFactor
        );

        const rotY = Math.random() * Math.PI * 2;
        const rotX = (Math.random() - 0.5) * 0.1;
        const rotZ = (Math.random() - 0.5) * 0.1;
        outerGroup.rotation.set(rotX, rotY, rotZ);

        this.models.push({ group: outerGroup, x: px, z: pz });
        this.container.add(outerGroup);
    }

    updatePosition() {
        if (!this.models || this.models.length === 0) return;

        this.models.forEach(({ group, x, z }) => {
            const terrainY = getTerrainHeight(x, z);

            group.position.set(x, 0, z);
            group.updateMatrixWorld(true);

            const box = new THREE.Box3().setFromObject(group);
            const minY = box.min.y;

            const embedDepth = 0.05;
            group.position.set(x, terrainY - minY - embedDepth, z);
        });
    }
}
