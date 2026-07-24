import * as THREE from 'three';
import { getTerrainHeight } from './MathUtils.js';

export class FoxDen {
    constructor(scene, position = new THREE.Vector3(-35, 0, 25)) {
        this.scene = scene;
        this.centerPos = position;
        
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.createDenStructure();
        this.updatePosition();
    }

    updatePosition() {
        const terrainY = getTerrainHeight(this.centerPos.x, this.centerPos.z);
        this.group.position.set(this.centerPos.x, terrainY + 0.1, this.centerPos.z);
    }

    createDenStructure() {
        const rockMat = new THREE.MeshStandardMaterial({ color: '#4a525d', roughness: 0.92, metalness: 0.08, flatShading: true });
        const mossRockMat = new THREE.MeshStandardMaterial({ color: '#2f4a2d', roughness: 0.95, metalness: 0.05, flatShading: true });
        const woodMat = new THREE.MeshStandardMaterial({ color: '#543b27', roughness: 0.88, metalness: 0.05, flatShading: true });

        // 1. Solid Ground Base Mound (Ensures Den sits securely on top of landscape surface)
        const baseGeo = new THREE.CylinderGeometry(6.5, 7.5, 0.6, 24);
        const baseMat = new THREE.MeshStandardMaterial({ color: '#2f4a2d', roughness: 0.95, flatShading: true });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.set(0, -0.2, 0);
        baseMesh.receiveShadow = true;
        this.group.add(baseMesh);

        // 2. Large Cave Mound / Back Shell
        const moundGeo = new THREE.DodecahedronGeometry(5.5, 1);
        const mound = new THREE.Mesh(moundGeo, mossRockMat);
        mound.scale.set(1.6, 1.0, 1.4);
        mound.position.set(0, 2.8, -1.2);
        mound.castShadow = true;
        mound.receiveShadow = true;
        this.group.add(mound);

        // 3. Prominent Entrance Archway Boulders
        const archPositions = [
            { x: -3.2, y: 1.8, z: 1.5, scale: 2.6 },
            { x: 3.2, y: 1.8, z: 1.5, scale: 2.6 },
            { x: -2.2, y: 3.8, z: 1.8, scale: 2.2 },
            { x: 2.2, y: 3.8, z: 1.8, scale: 2.2 },
            { x: 0.0, y: 4.6, z: 2.0, scale: 2.5 }, // Large keystone boulder
        ];

        const rockGeo = new THREE.DodecahedronGeometry(1, 0);
        archPositions.forEach((pos, i) => {
            const rock = new THREE.Mesh(rockGeo, (i % 2 === 0) ? rockMat : mossRockMat);
            rock.scale.setScalar(pos.scale);
            rock.rotation.set((i * 0.5) % Math.PI, (i * 0.9) % Math.PI, 0);
            rock.position.set(pos.x, pos.y, pos.z);
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.group.add(rock);
        });

        // 4. Wooden Log Entrance Pillars
        const logGeo = new THREE.CylinderGeometry(0.4, 0.45, 4.8, 8);
        const logLeft = new THREE.Mesh(logGeo, woodMat);
        logLeft.position.set(-2.5, 2.2, 2.0);
        logLeft.rotation.z = -0.15;
        logLeft.castShadow = true;
        this.group.add(logLeft);

        const logRight = new THREE.Mesh(logGeo, woodMat);
        logRight.position.set(2.5, 2.2, 2.0);
        logRight.rotation.z = 0.15;
        logRight.castShadow = true;
        this.group.add(logRight);

        // 5. Bright Cozy Warm Lantern Glow Light
        const denLight = new THREE.PointLight('#ffaa33', 4.0, 25);
        denLight.position.set(0, 1.8, 0.2);
        this.group.add(denLight);

        // Glow Aura Sprite
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, 'rgba(255, 180, 70, 0.95)');
        grad.addColorStop(0.5, 'rgba(255, 120, 30, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);

        const glowTex = new THREE.CanvasTexture(canvas);
        const glowSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: glowTex,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        glowSprite.position.set(0, 1.8, 1.0);
        glowSprite.scale.set(8, 8, 1);
        this.group.add(glowSprite);
    }
}
