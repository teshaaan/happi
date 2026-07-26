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

        // 3. Shoreline Rocks Framing the Pond (Optimized via InstancedMesh for minimum draw calls)
        const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#4a525d', roughness: 0.9, metalness: 0.1, flatShading: true });
        const mossMat = new THREE.MeshStandardMaterial({ color: '#2f4e2c', roughness: 0.95, metalness: 0.05, flatShading: true });

        const count = 30;
        const mossCount = Math.floor(count / 3);
        const stoneCount = count - mossCount;

        const stoneInstanced = new THREE.InstancedMesh(stoneGeo, stoneMat, stoneCount);
        const mossInstanced = new THREE.InstancedMesh(stoneGeo, mossMat, mossCount);
        stoneInstanced.castShadow = true;
        stoneInstanced.receiveShadow = true;
        mossInstanced.castShadow = true;
        mossInstanced.receiveShadow = true;

        const dummy = new THREE.Object3D();
        let stoneIdx = 0;
        let mossIdx = 0;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const r = this.radius + 0.1 + (Math.sin(i * 3) * 0.35);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const scale = 0.8 + (i % 5) * 0.22;
            dummy.scale.set(scale * 1.1, scale * 0.55, scale * 1.1);
            dummy.rotation.set((i * 0.7) % Math.PI, (i * 1.3) % Math.PI, 0);
            dummy.position.set(x, 0.1, z);
            dummy.updateMatrix();

            if (i % 3 === 0) {
                mossInstanced.setMatrixAt(mossIdx++, dummy.matrix);
            } else {
                stoneInstanced.setMatrixAt(stoneIdx++, dummy.matrix);
            }
        }
        stoneInstanced.instanceMatrix.needsUpdate = true;
        mossInstanced.instanceMatrix.needsUpdate = true;
        this.group.add(stoneInstanced);
        this.group.add(mossInstanced);

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
        const fishCount = 4;
        const koiStyles = [
            { base: '#f7f2e8', patches: ['#c75a1b', '#1f2933'] },
            { base: '#d96a24', patches: ['#f8f2e8', '#232323'] },
            { base: '#fbf4df', patches: ['#d3521e', '#d3521e'] },
            { base: '#2d2d2d', patches: ['#f4ead8', '#c75a1b'] },
        ];

        for (let i = 0; i < fishCount; i++) {
            const fishGroup = new THREE.Group();
            const style = koiStyles[i];

            const bodyGeo = new THREE.CircleGeometry(0.34, 24);
            const bodyMat = new THREE.MeshBasicMaterial({
                color: style.base,
                side: THREE.DoubleSide
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.scale.set(0.62, 1.65, 1.0);
            fishGroup.add(body);

            const tailGeo = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                0, -0.36, 0,
                -0.24, -0.82, 0,
                0.24, -0.82, 0
            ]);
            tailGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            tailGeo.computeVertexNormals();

            const tailMat = new THREE.MeshBasicMaterial({
                color: style.base,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.82
            });

            const tailFin = new THREE.Mesh(tailGeo, tailMat);
            fishGroup.add(tailFin);

            const finGeo = new THREE.BufferGeometry();
            finGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
                -0.20, 0.0, 0.002,
                -0.50, -0.20, 0.002,
                -0.26, -0.42, 0.002,
                0.20, 0.0, 0.002,
                0.50, -0.20, 0.002,
                0.26, -0.42, 0.002,
            ]), 3));
            finGeo.setIndex([0, 1, 2, 3, 5, 4]);
            finGeo.computeVertexNormals();
            const finMat = new THREE.MeshBasicMaterial({
                color: style.base,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.45
            });
            fishGroup.add(new THREE.Mesh(finGeo, finMat));

            style.patches.forEach((color, patchIdx) => {
                const patchGeo = new THREE.CircleGeometry(patchIdx === 0 ? 0.13 : 0.09, 14);
                const spotMat = new THREE.MeshBasicMaterial({
                    color,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.86
                });
                const spot = new THREE.Mesh(patchGeo, spotMat);
                spot.position.set(
                    patchIdx === 0 ? -0.08 : 0.12,
                    patchIdx === 0 ? 0.22 : -0.10,
                    0.01 + patchIdx * 0.002
                );
                spot.scale.set(1.35, 0.78, 1);
                spot.rotation.z = patchIdx === 0 ? 0.5 : -0.35;
                fishGroup.add(spot);
            });

            // Swimming path parameters
            const orbitRadiusX = 3.0 + i * 1.55;
            const orbitRadiusZ = 2.2 + (i % 2) * 2.4;
            const swimSpeed = 0.11 + i * 0.025;
            const swimAngle = (i / fishCount) * Math.PI * 2;
            const depth = 0.115 + i * 0.006;
            const phase = i * 1.7;

            fishGroup.scale.setScalar(0.78 + i * 0.06);
            fishGroup.rotation.x = -Math.PI / 2;
            fishGroup.renderOrder = 2;

            this.group.add(fishGroup);

            this.fishes.push({
                group: fishGroup,
                tail: tailFin,
                orbitRadiusX,
                orbitRadiusZ,
                swimSpeed,
                swimAngle,
                depth,
                phase,
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

            const x = Math.cos(fish.swimAngle) * fish.orbitRadiusX;
            const z = Math.sin(fish.swimAngle) * fish.orbitRadiusZ;
            const y = fish.depth + Math.sin(time * 0.8 + fish.phase) * 0.006;

            fish.group.position.set(x, y, z);

            // Orient fish to face swimming direction
            const tangentAngle = Math.atan2(
                Math.cos(fish.swimAngle) * fish.orbitRadiusZ * fish.direction,
                -Math.sin(fish.swimAngle) * fish.orbitRadiusX * fish.direction
            );
            fish.group.rotation.set(-Math.PI / 2, 0, tangentAngle);

            // Tail fin waggle
            fish.tail.rotation.z = Math.sin(time * 3.8 + fish.phase) * 0.18;
        });
    }
}
