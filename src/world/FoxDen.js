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
        this.group.position.set(this.centerPos.x, terrainY + 0.05, this.centerPos.z);
    }

    createDenStructure() {
        const rockMat = new THREE.MeshStandardMaterial({ color: '#4a525d', roughness: 0.92, metalness: 0.08, flatShading: true });
        const mossRockMat = new THREE.MeshStandardMaterial({ color: '#2f4a2d', roughness: 0.95, metalness: 0.05, flatShading: true });
        const woodMat = new THREE.MeshStandardMaterial({ color: '#543b27', roughness: 0.88, metalness: 0.05, flatShading: true });
        const strawMat = new THREE.MeshStandardMaterial({ color: '#6b522b', roughness: 0.9, flatShading: true });
        const darkInteriorMat = new THREE.MeshBasicMaterial({ color: '#0d1117' }); // Dark interior cave depth

        // 1. Foundation Base Slab
        const baseGeo = new THREE.CylinderGeometry(6.0, 7.0, 0.4, 24);
        const baseMat = new THREE.MeshStandardMaterial({ color: '#2b4427', roughness: 0.95, flatShading: true });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.set(0, -0.15, 0);
        baseMesh.receiveShadow = true;
        this.group.add(baseMesh);

        // 2. Hollow Cave Interior Back Wall & Cosy Leaf Bed
        const backWallGeo = new THREE.CylinderGeometry(3.5, 3.5, 3.2, 12, 1, false, Math.PI * 0.8, Math.PI * 1.4);
        const backWall = new THREE.Mesh(backWallGeo, darkInteriorMat);
        backWall.position.set(0, 1.6, -1.0);
        this.group.add(backWall);

        const bedGeo = new THREE.CylinderGeometry(2.2, 2.5, 0.15, 12);
        const bed = new THREE.Mesh(bedGeo, strawMat);
        bed.position.set(0, 0.1, -0.8);
        this.group.add(bed);

        // 3. Cave Roof Dome (Shifted back so the FRONT is wide OPEN)
        const roofGeo = new THREE.DodecahedronGeometry(4.8, 1);
        const roof = new THREE.Mesh(roofGeo, mossRockMat);
        roof.scale.set(1.5, 0.9, 1.2);
        roof.position.set(0, 3.2, -1.5); // Placed at back top so entrance is open
        roof.castShadow = true;
        roof.receiveShadow = true;
        this.group.add(roof);

        // 4. Open Entrance Archway Boulders (Framing the OPEN doorway)
        const archPositions = [
            { x: -3.2, y: 1.5, z: 0.8, scale: 2.4 },  // Left side rock
            { x: 3.2, y: 1.5, z: 0.8, scale: 2.4 },   // Right side rock
            { x: -2.4, y: 3.6, z: 0.9, scale: 2.0 },  // Left upper arch rock
            { x: 2.4, y: 3.6, z: 0.9, scale: 2.0 },   // Right upper arch rock
            { x: 0.0, y: 4.4, z: 1.0, scale: 2.2 },   // Top keystone boulder over doorway
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

        // 5. Wooden Log Doorway Pillars
        const logGeo = new THREE.CylinderGeometry(0.35, 0.4, 4.4, 8);
        const logLeft = new THREE.Mesh(logGeo, woodMat);
        logLeft.position.set(-2.4, 2.0, 1.2);
        logLeft.rotation.z = -0.12;
        logLeft.castShadow = true;
        this.group.add(logLeft);

        const logRight = new THREE.Mesh(logGeo, woodMat);
        logRight.position.set(2.4, 2.0, 1.2);
        logRight.rotation.z = 0.12;
        logRight.castShadow = true;
        this.group.add(logRight);

        // 6. Warm Cozy Interior Lantern Light (Spilling light out through the OPEN cave entrance)
        const denLight = new THREE.PointLight('#ff9922', 4.5, 25);
        denLight.position.set(0, 1.8, -0.2);
        this.group.add(denLight);

        // Interior Glow Aura Sprite
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, 'rgba(255, 170, 50, 0.95)');
        grad.addColorStop(0.5, 'rgba(255, 110, 20, 0.4)');
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
        glowSprite.position.set(0, 1.8, 0.5);
        glowSprite.scale.set(7, 7, 1);
        this.group.add(glowSprite);
    }
}
