import * as THREE from 'three';
import { getIslandBoundaryRadius } from './InvisibleBorder.js';
import { globalTelemetry } from '../services/telemetryService.js';

export class Ocean {
    constructor(scene, size = 1400, seaLevel = -0.4) {
        this.scene = scene;
        this.size = size;
        this.seaLevel = seaLevel;

        globalTelemetry.recordEvent('ocean_init', { size, seaLevel });

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.time = { value: 0 };
        this.waterShader = null;

        this.createLowPolyWater();
        this.createShoreFoam();
    }

    createLowPolyWater() {
        // Low-Poly plane with high segment density for faceted wave details
        const geometry = new THREE.PlaneGeometry(this.size, this.size, 140, 140);

        // Low-poly water material with soft roughness to eliminate specular glare
        this.material = new THREE.MeshStandardMaterial({
            color: '#12557a',
            roughness: 0.65,
            metalness: 0.05,
            flatShading: true,
            transparent: true,
            opacity: 0.90,
            side: THREE.DoubleSide
        });

        // Custom GPU shader for dynamic low-poly ocean waves
        this.material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.time;
            this.waterShader = shader;

            shader.vertexShader = `
                uniform float uTime;
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                vec3 transformed = vec3(position);
                
                // Low-poly multi-wave height displacement
                float wave1 = sin(transformed.x * 0.04 + uTime * 1.1) * 0.6;
                float wave2 = cos(transformed.y * 0.04 + uTime * 0.9) * 0.5;
                float wave3 = sin((transformed.x + transformed.y) * 0.025 + uTime * 0.7) * 0.4;
                float wave4 = cos(sqrt(transformed.x * transformed.x + transformed.y * transformed.y) * 0.03 - uTime * 0.8) * 0.35;
                
                transformed.z += wave1 + wave2 + wave3 + wave4;
                `
            );
        };

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(0, this.seaLevel, 0);
        this.mesh.receiveShadow = true;
        this.group.add(this.mesh);
    }

    createShoreFoam() {
        const foamMat = new THREE.MeshStandardMaterial({
            color: '#d4f2ff',
            roughness: 0.7,
            metalness: 0.05,
            flatShading: true,
            transparent: true,
            opacity: 0.42,
            side: THREE.DoubleSide
        });

        this.foamMeshes = [];
        [
            { inner: -10, outer: 2, opacity: 0.36, y: 0.10 },
            { inner: 5, outer: 12, opacity: 0.22, y: 0.16 },
            { inner: 18, outer: 24, opacity: 0.14, y: 0.20 },
        ].forEach((band, index) => {
            const foamGeo = this.createOrganicRingGeometry(band.inner, band.outer, 144, index);
            const material = foamMat.clone();
            material.opacity = band.opacity;
            const foamMesh = new THREE.Mesh(foamGeo, material);
            foamMesh.rotation.x = -Math.PI / 2;
            foamMesh.position.set(0, this.seaLevel + band.y, 0);
            foamMesh.userData = { speed: 0.008 + index * 0.004, bob: 0.05 + index * 0.02, baseY: this.seaLevel + band.y };
            this.foamMeshes.push(foamMesh);
            this.group.add(foamMesh);
        });
    }

    createOrganicRingGeometry(innerOffset, outerOffset, segments, phase = 0) {
        const vertices = [];
        const indices = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const base = getIslandBoundaryRadius(angle, 154);
            const ripple = Math.sin(angle * 11.0 + phase) * 1.8 + Math.cos(angle * 17.0 - phase) * 1.1;
            const innerR = base + innerOffset + ripple;
            const outerR = base + outerOffset + ripple * 1.25;

            vertices.push(
                Math.cos(angle) * innerR, Math.sin(angle) * innerR, 0,
                Math.cos(angle) * outerR, Math.sin(angle) * outerR, 0
            );
        }

        for (let i = 0; i < segments; i++) {
            const a = i * 2;
            indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
    }

    setSunsetProgress(t) {
        if (!this.material) return;
        const nightColor = new THREE.Color('#0e2f47');
        const sunsetColor = new THREE.Color('#2f7890');
        this.material.color.copy(nightColor).lerp(sunsetColor, t);
    }

    update(delta) {
        this.time.value += delta;
        
        // Gentle bobbing effect for the shoreline foam ring
        if (this.foamMeshes) {
            this.foamMeshes.forEach((mesh, index) => {
                mesh.position.y = mesh.userData.baseY + Math.sin(this.time.value * 1.5 + index) * mesh.userData.bob;
                mesh.rotation.z = this.time.value * mesh.userData.speed * (index % 2 === 0 ? 1 : -1);
            });
        }
    }
}
