import * as THREE from 'three';
import { getTerrainHeight } from './MathUtils.js';

export class Pond {
    constructor(scene, center = new THREE.Vector2(25, -20), radius = 11.5) {
        this.scene = scene;
        this.center = center;
        this.radius = radius;

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.fishes = [];

        this.createPondStructure();
        this.createSwimmingFish();
        this.updatePosition();
    }

    createPondStructure() {
        // 1. Deep Low-Poly Basin Foundation (3.8m deep underwater trench)
        const basinDepth = 3.8;
        const basinGeo = new THREE.CylinderGeometry(this.radius + 0.8, this.radius - 2.5, basinDepth, 36, 4, true);
        const basinMat = new THREE.MeshStandardMaterial({
            color: '#06161c',
            roughness: 0.95,
            metalness: 0.05,
            flatShading: true,
            side: THREE.BackSide
        });
        const basin = new THREE.Mesh(basinGeo, basinMat);
        basin.position.set(0, -basinDepth / 2 + 0.02, 0);
        basin.receiveShadow = true;
        this.group.add(basin);

        // Dark abyss floor at the bottom of the deep basin
        const floorGeo = new THREE.CircleGeometry(this.radius - 2.5, 36);
        const floorMat = new THREE.MeshStandardMaterial({
            color: '#030c12',
            roughness: 0.98,
            flatShading: true
        });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.set(0, -basinDepth + 0.02, 0);
        this.group.add(floorMesh);

        // 2. Serene Deep Translucent Water Surface (Soft roughness to eliminate specular glare)
        const waterGeo = new THREE.CircleGeometry(this.radius - 0.15, 48);
        this.waterMaterial = new THREE.MeshStandardMaterial({
            color: '#147b85',
            roughness: 0.60,
            metalness: 0.05,
            transparent: true,
            opacity: 0.85,
            flatShading: true,
        });

        // Water surface ripples
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
                float wave = sin(transformed.x * 0.2 + uTime * 0.9) * 0.035 + cos(transformed.y * 0.2 + uTime * 0.7) * 0.035;
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
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#4a525d', roughness: 0.9, metalness: 0.1, flatShading: true });
        const mossMat = new THREE.MeshStandardMaterial({ color: '#2f4e2c', roughness: 0.95, metalness: 0.05, flatShading: true });

        const count = 30;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const r = this.radius + 0.1 + (Math.sin(i * 3) * 0.35);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const stone = new THREE.Mesh(stoneGeo, (i % 3 === 0) ? mossMat : stoneMat);
            const scale = 0.8 + (i % 5) * 0.22;
            stone.scale.set(scale * 1.1, scale * 0.55, scale * 1.1);
            stone.rotation.set((i * 0.7) % Math.PI, (i * 1.3) % Math.PI, 0);
            stone.position.set(x, 0.1, z);
            stone.castShadow = true;
            stone.receiveShadow = true;
            this.group.add(stone);
        }

        // 4. Floating Lily Pads with Pink Flowers
        const padGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.03, 8);
        const padMat = new THREE.MeshStandardMaterial({ color: '#285e2f', roughness: 0.8, metalness: 0.1, flatShading: true });
        const flowerGeo = new THREE.ConeGeometry(0.28, 0.38, 6);
        const flowerMat = new THREE.MeshBasicMaterial({ color: '#ff66b2' });

        const padCount = 8;
        for (let i = 0; i < padCount; i++) {
            const angle = (i / padCount) * Math.PI * 2 + 0.3;
            const r = 2.0 + (i % 3) * 2.8;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const pad = new THREE.Mesh(padGeo, padMat);
            pad.position.set(x, 0.06, z);
            pad.rotation.y = i * 0.8;
            pad.scale.setScalar(0.7 + (i % 4) * 0.15);

            if (i % 2 === 0) {
                const flower = new THREE.Mesh(flowerGeo, flowerMat);
                flower.position.set(0, 0.22, 0);
                pad.add(flower);
            }

            this.group.add(pad);
        }

        // 5. Deep Underwater Light
        this.waterLight = new THREE.PointLight('#28e8d8', 3.5, 28);
        this.waterLight.position.set(0, -1.8, 0);
        this.group.add(this.waterLight);
    }

    createSwimmingFish() {
        const fishCount = 12;

        const fishPalette = [
            '#ff5500', // Bright Koi Orange
            '#ffffff', // Calico White
            '#ffaa00', // Golden Fish
            '#e62e00', // Crimson Red
            '#ff7733', // Sunset Orange
        ];

        for (let i = 0; i < fishCount; i++) {
            const fishGroup = new THREE.Group();

            // Fish body (sleek cone shape)
            const bodyGeo = new THREE.ConeGeometry(0.2, 0.7, 6);
            bodyGeo.rotateX(Math.PI / 2);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: fishPalette[i % fishPalette.length],
                roughness: 0.4,
                metalness: 0.2,
                flatShading: true
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            fishGroup.add(body);

            // Tail fin (flat triangular plane)
            const tailGeo = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                0, 0, 0,
                0, 0.22, -0.35,
                0, -0.22, -0.35
            ]);
            tailGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            tailGeo.computeVertexNormals();

            const tailMat = new THREE.MeshStandardMaterial({
                color: fishPalette[i % fishPalette.length],
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9,
                flatShading: true
            });

            const tailFin = new THREE.Mesh(tailGeo, tailMat);
            tailFin.position.set(0, 0, -0.35);
            fishGroup.add(tailFin);

            // Swimming path parameters
            const orbitRadius = 2.0 + Math.random() * (this.radius - 3.2);
            const swimSpeed = 0.4 + Math.random() * 0.6;
            const swimAngle = Math.random() * Math.PI * 2;
            const depth = -0.5 - Math.random() * 2.2;
            const phase = Math.random() * Math.PI * 2;

            fishGroup.scale.setScalar(0.75 + Math.random() * 0.5);

            this.group.add(fishGroup);

            this.fishes.push({
                group: fishGroup,
                tail: tailFin,
                orbitRadius: orbitRadius,
                swimSpeed: swimSpeed,
                swimAngle: swimAngle,
                depth: depth,
                phase: phase,
                direction: (i % 2 === 0) ? 1 : -1
            });
        }
    }

    updatePosition() {
        const terrainY = getTerrainHeight(this.center.x, this.center.y);
        this.group.position.set(this.center.x, terrainY + 0.05, this.center.y);
    }

    update(delta) {
        if (this.waterShader) {
            this.waterShader.uniforms.uTime.value += delta;
        }

        // Animate swimming fish
        const time = performance.now() * 0.001;

        this.fishes.forEach((fish) => {
            fish.swimAngle += fish.swimSpeed * fish.direction * delta;

            const x = Math.cos(fish.swimAngle) * fish.orbitRadius;
            const z = Math.sin(fish.swimAngle) * fish.orbitRadius;
            const y = fish.depth + Math.sin(time * 1.5 + fish.phase) * 0.15;

            fish.group.position.set(x, y, z);

            // Orient fish to face swimming direction
            const tangentAngle = fish.swimAngle + (fish.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
            fish.group.rotation.y = tangentAngle;

            // Tail fin waggle
            fish.tail.rotation.y = Math.sin(time * 9.0 + fish.phase) * 0.45;
        });
    }
}
