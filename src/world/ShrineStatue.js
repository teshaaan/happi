import * as THREE from 'three';
import { loadGLTF } from './AssetLoader.js';
import { getTerrainHeight } from './MathUtils.js';
import { globalTelemetry } from '../services/telemetryService.js';

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

        globalTelemetry.recordEvent('shrine_statue_init', { count: SHRINE_POSITIONS.length });
        this.loadShrineModel();
    }

    loadShrineModel() {
        loadGLTF('/shinto_style_statueshrine.glb', (gltf) => {
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

                this.models.push({ group: outerGroup, config: posConfig, activated: false, light: null });
                this.container.add(outerGroup);
            });

            this.updatePosition();
        }, undefined, (err) => {
            console.warn('Error loading shinto_style_statueshrine.glb:', err);
        });
    }

    activateShrine(index) {
        if (!this.models || index < 0 || index >= this.models.length) return false;
        const entry = this.models[index];
        if (entry.activated) return false;

        entry.activated = true;

        const glowGroup = new THREE.Group();

        // Visible fire and halo above the shrine base.
        const fireGeo = new THREE.SphereGeometry(0.48, 20, 20);
        const fireMat = new THREE.MeshBasicMaterial({ color: '#ffd447' });
        const fireMesh = new THREE.Mesh(fireGeo, fireMat);
        fireMesh.position.set(0, 3.0, 0);

        const haloGeo = new THREE.SphereGeometry(1.85, 24, 16);
        const haloMat = new THREE.MeshBasicMaterial({
            color: '#ffd447',
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.position.copy(fireMesh.position);
        haloMesh.scale.set(1.1, 0.75, 1.1);

        const baseGlowGeo = new THREE.CircleGeometry(2.8, 36);
        const baseGlowMat = new THREE.MeshBasicMaterial({
            color: '#ffd447',
            transparent: true,
            opacity: 0.28,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        const baseGlow = new THREE.Mesh(baseGlowGeo, baseGlowMat);
        baseGlow.rotation.x = -Math.PI / 2;
        baseGlow.position.set(0, 0.1, 0);

        const light = new THREE.PointLight('#ffd447', 7.5, 26);
        light.position.copy(fireMesh.position);
        light.castShadow = false;

        glowGroup.add(baseGlow);
        glowGroup.add(haloMesh);
        glowGroup.add(fireMesh);
        glowGroup.add(light);

        entry.group.add(glowGroup);
        entry.glowGroup = glowGroup;
        entry.baseGlow = baseGlow;
        entry.haloMesh = haloMesh;
        entry.fireMesh = fireMesh;
        entry.light = light;

        return true;
    }

    resetShrines() {
        if (!this.models) return;

        this.models.forEach((entry) => {
            entry.activated = false;
            if (entry.fireMesh) {
                entry.group.remove(entry.glowGroup);
                entry.glowGroup.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
            entry.glowGroup = null;
            entry.baseGlow = null;
            entry.haloMesh = null;
            entry.fireMesh = null;
            entry.light = null;
        });
    }

    isShrineActivated(index) {
        return !!(this.models[index] && this.models[index].activated);
    }

    update(delta) {
        if (!this.models) return;
        const now = Date.now() * 0.008;
        this.models.forEach((entry, idx) => {
            if (entry.activated && entry.light) {
                // Subtle organic flame flicker
                entry.light.intensity = 6.8 + Math.sin(now * 2.5 + idx * 1.7) * 0.8 + Math.cos(now * 4.1) * 0.35;
                if (entry.fireMesh) {
                    entry.fireMesh.scale.setScalar(0.8 + Math.sin(now * 3.2 + idx) * 0.16);
                }
                if (entry.haloMesh) {
                    entry.haloMesh.material.opacity = 0.18 + Math.sin(now * 2.0 + idx) * 0.05;
                }
                if (entry.baseGlow) {
                    entry.baseGlow.material.opacity = 0.22 + Math.cos(now * 1.7 + idx) * 0.04;
                }
            }
        });
    }

    updatePosition() {
        if (!this.models || this.models.length === 0) return;

        this.models.forEach((entry) => {
            const { group, config } = entry;
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
