import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MathUtils.js';

export class CherryTree {
    constructor(scene) {
        this.scene = scene;
        this.treeModel = null;
        this.treePosition = new THREE.Vector3(83.73, 0, -53.62);

        this.fallingPetalsMesh = null;
        this.fallingPetalsData = [];
        this.fallenPetalsMesh = null;

        this.loadTreeModel();
    }

    loadTreeModel() {
        const loader = new GLTFLoader();
        loader.load('/low-_poly_cherry_blossom_tree_3d_models.glb', (gltf) => {
            const rawModel = gltf.scene;

            // 1. Normalize height scale to match PlacementEditor structure
            const rawBounds = new THREE.Box3().setFromObject(rawModel);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            const targetHeight = Math.min(Math.max(rawSize.y, 3), 10);
            const normScale = targetHeight / Math.max(rawSize.y, 0.001);
            rawModel.scale.setScalar(normScale);

            // 2. Enable shadows & lighting response
            rawModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // 3. Center pivot & align ground bottom to match PlacementEditor
            const bounds = new THREE.Box3().setFromObject(rawModel);
            const center = bounds.getCenter(new THREE.Vector3());
            rawModel.position.x -= center.x;
            rawModel.position.z -= center.z;
            rawModel.position.y -= bounds.min.y;

            // 4. Create outer transform group to hold exact editor transforms
            const outerGroup = new THREE.Group();
            outerGroup.add(rawModel);

            const x = this.treePosition.x;
            const z = this.treePosition.z;

            outerGroup.rotation.set(-3.142, 0.078, -3.142);
            outerGroup.scale.set(1.667, 1.845, 2.121);
            outerGroup.position.set(x, 0, z);

            this.treeModel = outerGroup;
            this.scene.add(outerGroup);

            this.updatePosition();
            this.setupFallingPetals();
            this.setupFallenPetals();
        }, undefined, (err) => {
            console.warn('Error loading low-_poly_cherry_blossom_tree_3d_models.glb:', err);
        });
    }

    setupFallingPetals() {
        const count = 180;
        const positions = new Float32Array(count * 3);
        const scales = new Float32Array(count);
        const colors = new Float32Array(count * 3);

        const sakuraColors = [
            new THREE.Color('#ffb7c5'), // Classic Sakura Pink
            new THREE.Color('#ff69b4'), // Deep Pink
            new THREE.Color('#ffe4e1'), // Misty Rose Pink
            new THREE.Color('#ffc0cb'), // Soft Pastel Pink
            new THREE.Color('#f78fb3'), // Vibrant Petal Magenta
        ];

        const cx = this.treePosition.x;
        const cz = this.treePosition.z;
        const terrainY = getTerrainHeight(cx, cz);

        this.fallingPetalsData = [];

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 9.5;
            const px = cx + Math.cos(angle) * radius;
            const pz = cz + Math.sin(angle) * radius;
            const py = terrainY + 1.5 + Math.random() * 14.5;

            positions[i3] = px;
            positions[i3 + 1] = py;
            positions[i3 + 2] = pz;

            scales[i] = 1.0 + Math.random() * 1.8;

            const col = sakuraColors[i % sakuraColors.length];
            colors[i3] = col.r;
            colors[i3 + 1] = col.g;
            colors[i3 + 2] = col.b;

            this.fallingPetalsData.push({
                x: px,
                y: py,
                z: pz,
                radius: radius,
                angle: angle,
                fallSpeed: 0.6 + Math.random() * 1.2,
                swaySpeed: 1.5 + Math.random() * 2.0,
                swayRadius: 0.3 + Math.random() * 0.7,
                phase: Math.random() * Math.PI * 2,
                minY: terrainY + 0.1
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
            vertexColors: true,
            uniforms: {
                uTime: { value: 0 }
            },
            vertexShader: `
                uniform float uTime;
                attribute float aScale;
                varying vec3 vColor;

                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float distanceScale = 1.0 / max(0.5, -mvPosition.z);
                    gl_PointSize = aScale * (38.0 * distanceScale);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;

                void main() {
                    vec2 uv = gl_PointCoord - vec2(0.5);
                    float dist = length(uv);

                    // Organic oval petal alpha shape
                    float shape = smoothstep(0.48, 0.05, dist);
                    float alpha = shape * 0.88;

                    if (alpha < 0.02) discard;
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
        });

        this.fallingPetalsMesh = new THREE.Points(geometry, material);
        this.scene.add(this.fallingPetalsMesh);
    }

    setupFallenPetals() {
        const count = 220;
        const cx = this.treePosition.x;
        const cz = this.treePosition.z;

        // Quad geometry representing individual fallen sakura petals
        const petalGeo = new THREE.PlaneGeometry(0.35, 0.22);
        
        const sakuraColors = [
            new THREE.Color('#ffb7c5'),
            new THREE.Color('#ff69b4'),
            new THREE.Color('#ffe4e1'),
            new THREE.Color('#f78fb3')
        ];

        const petalMat = new THREE.MeshStandardMaterial({
            color: '#ffb7c5',
            roughness: 0.85,
            metalness: 0.0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.92
        });

        this.fallenPetalsMesh = new THREE.InstancedMesh(petalGeo, petalMat, count);
        this.fallenPetalsMesh.receiveShadow = true;

        const dummy = new THREE.Object3D();

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.5 + Math.pow(Math.random(), 0.6) * 11.5;
            const px = cx + Math.cos(angle) * radius;
            const pz = cz + Math.sin(angle) * radius;
            const py = getTerrainHeight(px, pz) + 0.03 + Math.random() * 0.02;

            dummy.position.set(px, py, pz);
            dummy.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.15;
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.rotation.z = (Math.random() - 0.5) * 0.2;

            const scale = 0.6 + Math.random() * 0.8;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            this.fallenPetalsMesh.setMatrixAt(i, dummy.matrix);

            const c = sakuraColors[i % sakuraColors.length];
            this.fallenPetalsMesh.setColorAt(i, c);
        }

        this.fallenPetalsMesh.instanceMatrix.needsUpdate = true;
        if (this.fallenPetalsMesh.instanceColor) {
            this.fallenPetalsMesh.instanceColor.needsUpdate = true;
        }

        this.scene.add(this.fallenPetalsMesh);
    }

    updatePosition() {
        if (!this.treeModel) return;
        const x = this.treePosition.x;
        const z = this.treePosition.z;
        const terrainY = getTerrainHeight(x, z);

        this.treeModel.position.set(x, 0, z);
        this.treeModel.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(this.treeModel);
        const minY = box.min.y;

        const embedDepth = 0.3;
        this.treeModel.position.set(x, terrainY - minY - embedDepth, z);

        // Re-align fallen petals ground heights if landscape finishes loading
        if (this.fallenPetalsMesh) {
            const dummy = new THREE.Object3D();
            const count = this.fallenPetalsMesh.count;
            for (let i = 0; i < count; i++) {
                this.fallenPetalsMesh.getMatrixAt(i, dummy.matrix);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                const py = getTerrainHeight(dummy.position.x, dummy.position.z) + 0.03;
                dummy.position.y = py;
                dummy.updateMatrix();
                this.fallenPetalsMesh.setMatrixAt(i, dummy.matrix);
            }
            this.fallenPetalsMesh.instanceMatrix.needsUpdate = true;
        }
    }

    update(delta = 0.016) {
        if (!this.fallingPetalsMesh || this.fallingPetalsData.length === 0) return;

        if (this.fallingPetalsMesh.material.uniforms.uTime) {
            this.fallingPetalsMesh.material.uniforms.uTime.value += delta;
        }

        const time = this.fallingPetalsMesh.material.uniforms.uTime.value;
        const positions = this.fallingPetalsMesh.geometry.attributes.position.array;
        const cx = this.treePosition.x;
        const cz = this.treePosition.z;

        for (let i = 0; i < this.fallingPetalsData.length; i++) {
            const data = this.fallingPetalsData[i];
            const i3 = i * 3;

            // Fall downward
            data.y -= data.fallSpeed * delta;

            // Sway in gentle wind wave
            const swayX = Math.sin(time * data.swaySpeed + data.phase) * data.swayRadius * delta * 2.0;
            const swayZ = Math.cos(time * data.swaySpeed * 0.8 + data.phase) * data.swayRadius * delta * 1.5;

            data.x += swayX;
            data.z += swayZ;

            // Reset when reaching ground
            const currentTerrainY = getTerrainHeight(data.x, data.z);
            if (data.y <= currentTerrainY + 0.15) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 9.5;
                data.x = cx + Math.cos(angle) * radius;
                data.z = cz + Math.sin(angle) * radius;
                data.y = currentTerrainY + 12.0 + Math.random() * 5.0;
            }

            positions[i3] = data.x;
            positions[i3 + 1] = data.y;
            positions[i3 + 2] = data.z;
        }

        this.fallingPetalsMesh.geometry.attributes.position.needsUpdate = true;
    }
}
