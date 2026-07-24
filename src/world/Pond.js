import * as THREE from 'three';
import { getTerrainHeight } from './MathUtils.js';

export class Pond {
    constructor(scene, center = new THREE.Vector2(25, -20), radius = 20.0) {
        this.scene = scene;
        this.center = center;
        this.radius = radius;

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.createPondStructure();
        this.updatePosition();
    }

    createPondStructure() {
        // 1. Shallow Low-Poly Basin Foundation (Blends smoothly into flat ground)
        const basinGeo = new THREE.CylinderGeometry(this.radius + 0.8, this.radius + 0.2, 0.3, 36);
        const basinMat = new THREE.MeshStandardMaterial({ color: '#274224', roughness: 0.95, flatShading: true });
        const basin = new THREE.Mesh(basinGeo, basinMat);
        basin.position.set(0, -0.12, 0);
        basin.receiveShadow = true;
        this.group.add(basin);

        // 2. Serene Translucent Water Surface
        const waterGeo = new THREE.CircleGeometry(this.radius - 0.2, 48);
        this.waterMaterial = new THREE.MeshStandardMaterial({
            color: '#1c8282',
            roughness: 0.05,
            metalness: 0.8,
            transparent: true,
            opacity: 0.88,
            flatShading: true,
        });

        // Subtle, smooth water ripples (very gentle, silky wave motion)
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
                float wave = sin(transformed.x * 0.15 + uTime * 0.8) * 0.03 + cos(transformed.y * 0.15 + uTime * 0.6) * 0.03;
                transformed.z += wave;
                `
            );
        };

        this.waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
        this.waterMesh.rotation.x = -Math.PI / 2;
        this.waterMesh.position.set(0, 0.04, 0);
        this.waterMesh.receiveShadow = true;
        this.group.add(this.waterMesh);

        // 3. Shoreline Rocks Framing the Pond
        const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#525a66', roughness: 0.9, metalness: 0.1, flatShading: true });
        const mossMat = new THREE.MeshStandardMaterial({ color: '#355832', roughness: 0.95, metalness: 0.05, flatShading: true });

        const count = 36;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const r = this.radius + 0.1 + (Math.sin(i * 3) * 0.4);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const stone = new THREE.Mesh(stoneGeo, (i % 3 === 0) ? mossMat : stoneMat);
            const scale = 0.9 + (i % 5) * 0.25;
            stone.scale.set(scale * 1.1, scale * 0.5, scale * 1.1);
            stone.rotation.set((i * 0.7) % Math.PI, (i * 1.3) % Math.PI, 0);
            stone.position.set(x, 0.1, z);
            stone.castShadow = true;
            stone.receiveShadow = true;
            this.group.add(stone);
        }

        // 4. Floating Lily Pads with Pink Flowers
        const padGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.03, 8);
        const padMat = new THREE.MeshStandardMaterial({ color: '#2d6a35', roughness: 0.8, metalness: 0.1, flatShading: true });
        const flowerGeo = new THREE.ConeGeometry(0.3, 0.4, 6);
        const flowerMat = new THREE.MeshBasicMaterial({ color: '#ff66b2' });

        const padCount = 10;
        for (let i = 0; i < padCount; i++) {
            const angle = (i / padCount) * Math.PI * 2 + 0.3;
            const r = 3.0 + (i % 4) * 3.8;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const pad = new THREE.Mesh(padGeo, padMat);
            pad.position.set(x, 0.06, z);
            pad.rotation.y = i * 0.8;
            pad.scale.setScalar(0.75 + (i % 4) * 0.15);

            if (i % 2 === 0) {
                const flower = new THREE.Mesh(flowerGeo, flowerMat);
                flower.position.set(0, 0.25, 0);
                pad.add(flower);
            }

            this.group.add(pad);
        }

        // 5. Underwater Soft Cyan Glow Light
        this.waterLight = new THREE.PointLight('#30e0e0', 3.0, 35);
        this.waterLight.position.set(0, -0.4, 0);
        this.group.add(this.waterLight);
    }

    updatePosition() {
        const terrainY = getTerrainHeight(this.center.x, this.center.y);
        this.group.position.set(this.center.x, terrainY + 0.05, this.center.y);
    }

    update(delta) {
        if (this.waterShader) {
            this.waterShader.uniforms.uTime.value += delta;
        }
    }
}
