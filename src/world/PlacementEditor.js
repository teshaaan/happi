import * as THREE from 'three';
import { loadGLTF } from './AssetLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { getTerrainHeight } from './MathUtils.js';

export class PlacementEditor {
    constructor(scene, camera, rendererDomElement, orbitControls) {
        this.scene = scene;
        this.camera = camera;
        this.orbitControls = orbitControls;
        this.loader = null;
        this.enabled = false;
        this.assetPath = '/shinto_style_statueshrine.glb';
        this.selected = null;
        this.innerModel = null;

        this.group = new THREE.Group();
        this.group.visible = false;
        this.scene.add(this.group);

        this.grid = new THREE.GridHelper(320, 32, '#ffffff', '#6b7280');
        this.grid.material.transparent = true;
        this.grid.material.opacity = 0.22;
        this.grid.visible = false;
        this.scene.add(this.grid);

        this.axes = new THREE.AxesHelper(16);
        this.axes.visible = false;
        this.scene.add(this.axes);

        this.transform = new TransformControls(camera, rendererDomElement);
        this.transform.setMode('translate');
        this.transform.setSpace('world');
        this.transform.showY = true;
        this.transformHelper = this.transform.getHelper();
        this.transformHelper.visible = false;
        this.scene.add(this.transformHelper);

        this.transform.addEventListener('dragging-changed', (event) => {
            this.orbitControls.enabled = !event.value;
        });

        this.transform.addEventListener('objectChange', () => {
            this.updateSnapshot();
        });

        this.loadAsset(this.assetPath);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        this.group.visible = enabled;
        this.grid.visible = enabled;
        this.axes.visible = enabled;
        this.transformHelper.visible = enabled;

        if (enabled && this.selected) {
            this.transform.attach(this.selected);
        } else {
            this.transform.detach();
        }

        this.updateSnapshot();
    }

    setMode(mode) {
        this.transform.setMode(mode);
        this.updateSnapshot();
    }

    loadAsset(assetPath) {
        this.assetPath = assetPath;
        const previousPosition = this.selected?.position.clone() ?? new THREE.Vector3(0, getTerrainHeight(0, 0), 0);
        const previousRotation = this.selected?.rotation.clone() ?? new THREE.Euler();
        const previousScale = this.selected?.scale.clone() ?? new THREE.Vector3(1, 1, 1);

        this.transform.detach();
        this.group.clear();
        this.selected = new THREE.Group();
        this.innerModel = null;
        this.selected.position.copy(previousPosition);
        this.selected.rotation.copy(previousRotation);
        this.selected.scale.copy(previousScale);
        this.group.add(this.selected);

        loadGLTF(assetPath, (gltf) => {
            const model = gltf.scene;

            const rawBounds = new THREE.Box3().setFromObject(model);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            const targetHeight = Math.min(Math.max(rawSize.y, 3), 10);
            const scale = targetHeight / Math.max(rawSize.y, 0.001);
            model.scale.setScalar(scale);

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            const bounds = new THREE.Box3().setFromObject(model);
            const center = bounds.getCenter(new THREE.Vector3());
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= bounds.min.y;

            this.selected.add(model);
            this.innerModel = model;

            if (this.enabled) {
                this.transform.attach(this.selected);
            }

            this.updateSnapshot();
        }, undefined, (err) => {
            console.warn(`Error loading placement asset ${assetPath}:`, err);
        });
    }

    snapToGround() {
        if (!this.selected) return;
        const x = this.selected.position.x;
        const z = this.selected.position.z;
        const terrainY = getTerrainHeight(x, z);

        // Compute true lowest vertex Y position of rotated geometry
        this.selected.position.y = 0;
        this.selected.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(this.selected);
        const minY = box.min.y;

        this.selected.position.y = Number((terrainY - minY).toFixed(2));
        this.updateSnapshot();
    }

    updateSnapshot() {
        if (!this.selected) return null;

        const position = this.selected.position;
        const rotation = this.selected.rotation;
        const scale = this.selected.scale;

        this.snapshot = {
            assetPath: this.assetPath,
            position: {
                x: Number(position.x.toFixed(2)),
                y: Number(position.y.toFixed(2)),
                z: Number(position.z.toFixed(2)),
            },
            rotation: {
                x: Number(rotation.x.toFixed(3)),
                y: Number(rotation.y.toFixed(3)),
                z: Number(rotation.z.toFixed(3)),
            },
            scale: {
                x: Number(scale.x.toFixed(3)),
                y: Number(scale.y.toFixed(3)),
                z: Number(scale.z.toFixed(3)),
            },
            code: this.getPlacementCode(),
        };

        return this.snapshot;
    }

    getPlacementCode() {
        if (!this.selected) return '';

        const p = this.selected.position;
        const r = this.selected.rotation;
        const s = this.selected.scale;

        const x = p.x.toFixed(2);
        const y = p.y.toFixed(2);
        const z = p.z.toFixed(2);
        const rx = r.x.toFixed(3);
        const ry = r.y.toFixed(3);
        const rz = r.z.toFixed(3);
        const sx = s.x.toFixed(3);
        const sy = s.y.toFixed(3);
        const sz = s.z.toFixed(3);

        return [
            `// ${this.assetPath}`,
            `const x = ${x};`,
            `const y = ${y};`,
            `const z = ${z};`,
            `model.position.set(x, y, z);`,
            `model.rotation.set(${rx}, ${ry}, ${rz});`,
            `model.scale.set(${sx}, ${sy}, ${sz});`,
        ].join('\n');
    }

    dispose() {
        this.transform.detach();
        this.transform.dispose();
        this.scene.remove(this.transformHelper);
        this.scene.remove(this.group);
        this.scene.remove(this.grid);
        this.scene.remove(this.axes);
    }
}
