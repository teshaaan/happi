import * as THREE from 'three';
import { getTerrainHeight } from './MathUtils.js';

export class Pond {
    constructor(scene, center = new THREE.Vector2(45, -35), radius = 22.0) {
        this.scene = scene;
        this.center = center;
        this.radius = radius;

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.createPondStructure();
        this.updatePosition();
    }

    createPondStructure() {
        // 1. Recessed Basin Base Rim (Ensures Pond sits solidly on top of ground)
        const basinGeo = new THREE.CylinderGeometry(this.radius + 1.2, this.radius + 0.5, 0.5, 36);
        const basinMat = new THREE.MeshStandardMaterial({ color: '#294426', roughness: 0.95, flatShading: true });
        const basin = new THREE.Mesh(basinGeo, basinMat);
        basin.position.set(0, -0.2, 0);
        basin.receiveShadow = true;
        this.group.add(basin);

        // 2. Vivid Translucent Water Surface Mesh
        const waterGeo = new THREE.CircleGeometry(this.radius - 0.2, 48);
        this.waterMaterial = new THREE.MeshStandardMaterial({
            color: '#1a8c8c',
            roughness: 0.08,
            metalness: 0.85,
            transparent: true,
            opacity: 0.88,
            flatShading: true,
        });

        this.waterMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.waterShader = shader;

            shader.vertexShader = `
                uniform float uTime;
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                vec3 transformed = vec3(position);
                float wave = sin(transformed.x * 0.4 + uTime * 2.0) * 0.12 + cos(transformed.y * 0.4 + uTime * 1.5) * 0.12;
                transformed.z += wave;
                `
            );
        };

        this.waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
        this.waterMesh.rotation.x = -Math.PI / 2;
        this.waterMesh.position.set(0, 0.08, 0);
        this.waterMesh.receiveShadow = true;
        this.group.add(this.waterMesh);

        // 3. Shoreline Rock Ring
        const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#525a66', roughness: 0.9, metalness: 0.1, flatShading: true });
        const mossMat = new THREE.MeshStandardMaterial({ color: '#355832', roughness: 0.95, metalness: 0.05, flatShading: true });

        const count = 38;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const r = this.radius + 0.1 + (Math.sin(i * 3) * 0.5);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const stone = new THREE.Mesh(stoneGeo, (i % 3 === 0) ? mossMat : stoneMat);
            const scale = 1.1 + (i % 5) * 0.3;
            stone.scale.set(scale * 1.2, scale * 0.7, scale * 1.2);
            stone.rotation.set((i * 0.7) % Math.PI, (i * 1.3) % Math.PI, 0);
            stone.position.set(x, 0.25, z);
            stone.castShadow = true;
            stone.receiveShadow = true;
            this.group.add(stone);
        }

        // 4. Floating Lily Pads with Flowers
        const padGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.04, 8);
        const padMat = new THREE.MeshStandardMaterial({ color: '#2d6a35', roughness: 0.8, metalness: 0.1, flatShading: true });
        const flowerGeo = new THREE.ConeGeometry(0.35, 0.45, 6);
        const flowerMat = new THREE.MeshBasicMaterial({ color: '#ff66b2' });

        const padCount = 10;
        for (let i = 0; i < padCount; i++) {
            const angle = (i / padCount) * Math.PI * 2 + 0.3;
            const r = 3.5 + (i % 4) * 4.2;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const pad = new THREE.Mesh(padGeo, padMat);
            pad.position.set(x, 0.12, z);
            pad.rotation.y = i * 0.8;
            pad.scale.setScalar(0.8 + (i % 4) * 0.18);

            if (i % 2 === 0) {
                const flower = new THREE.Mesh(flowerGeo, flowerMat);
                flower.position.set(0, 0.28, 0);
                pad.add(flower);
            }

            this.group.add(pad);
        }

        // 5. Underwater Cyan Glow Light
        this.waterLight = new THREE.PointLight('#30e0e0', 3.5, 45);
        this.waterLight.position.set(0, -0.4, 0);
        this.group.add(this.waterLight);
    }

    updatePosition() {
        const terrainY = getTerrainHeight(this.center.x, this.center.y);
        this.group.position.set(this.center.x, terrainY + 0.1, this.center.y);
    }

    update(delta) {
        if (this.waterShader) {
            this.waterShader.uniforms.uTime.value += delta;
        }
    }
}
