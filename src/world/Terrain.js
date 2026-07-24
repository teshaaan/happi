import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { registerTerrainMesh } from './MathUtils.js';

export class Terrain {
    constructor(scene, onLoadCallback = null) {
        this.scene = scene;
        this.onLoadCallback = onLoadCallback;
        this.time = { value: 0 };
        this.landscapeGroup = new THREE.Group();
        this.scene.add(this.landscapeGroup);

        // 1. Base extended ground plane (600x600) for seamless horizon
        this.geometry = new THREE.PlaneGeometry(600, 600, 150, 150);
        this.material = new THREE.MeshStandardMaterial({
            color: '#264e2e',
            roughness: 0.92,
            metalness: 0.05,
            flatShading: true,
        });

        const posAttr = this.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const h = Math.sin(x * 0.035) * 1.8 + Math.cos(y * 0.035) * 1.5 + Math.sin((x + y) * 0.07) * 0.8;
            posAttr.setZ(i, h);
        }
        this.geometry.computeVertexNormals();

        this.baseMesh = new THREE.Mesh(this.geometry, this.material);
        this.baseMesh.rotation.x = -Math.PI / 2;
        this.baseMesh.position.y = 0.0;
        this.baseMesh.receiveShadow = true;
        this.landscapeGroup.add(this.baseMesh);
        registerTerrainMesh(this.baseMesh);

        this.mesh = this.baseMesh;

        // 2. Load 3D landscape model
        this.loadLandscape();
    }

    loadLandscape() {
        const loader = new GLTFLoader();
        loader.load('/landscape.glb', (gltf) => {
            const landscape = gltf.scene;

            const rawBounds = new THREE.Box3().setFromObject(landscape);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            const maxDim = Math.max(rawSize.x, rawSize.z);
            
            const targetSpan = 360;
            const scaleFactor = targetSpan / Math.max(maxDim, 0.001);
            landscape.scale.setScalar(scaleFactor);

            const scaledBounds = new THREE.Box3().setFromObject(landscape);
            const center = scaledBounds.getCenter(new THREE.Vector3());
            landscape.position.x -= center.x;
            landscape.position.z -= center.z;
            landscape.position.y -= scaledBounds.min.y;

            landscape.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.roughness = 0.85;
                        child.material.metalness = 0.05;
                    }
                    // Register all 3D landscape surface meshes so characters walk on top of hills, mountains, and paths
                    registerTerrainMesh(child);
                }
            });

            this.landscapeGroup.add(landscape);

            if (this.onLoadCallback) {
                this.onLoadCallback();
            }
        }, undefined, (err) => {
            console.warn('Error loading landscape.glb:', err);
        });
    }

    update(delta) {
        // Keeps terrain updated
    }
}