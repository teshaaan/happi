import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MathUtils.js';
import { DuckController } from './DuckController.js';

export class Duck {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        this.active = false;
        
        // Offset settings
        this.yOffset = 0.05;
        this.groundOffset = 0.0;

        // Duck Flight Controller (instantiated once mesh loads)
        this.controller = null;

        this.initLoader();
    }

    initLoader() {
        const loader = new GLTFLoader();
        loader.load('/duck.glb', (gltf) => {
            // Create a wrapper group to normalize orientation (+Z forward)
            this.mesh = new THREE.Group();
            
            // Normalize size of the GLTF model
            const rawBounds = new THREE.Box3().setFromObject(gltf.scene);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            const targetHeight = 3.0; // Fit nicely in the world
            const scale = targetHeight / Math.max(rawSize.y, 0.001);
            gltf.scene.scale.setScalar(scale);

            // Enable shadows
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Add inner model to wrapper group
            this.mesh.add(gltf.scene);

            // Compute ground offset for the wrapper group
            const bounds = new THREE.Box3().setFromObject(this.mesh);
            this.groundOffset = Math.max(0, -bounds.min.y);

            // Spawn the duck in the center of the Pond (45, -35)
            this.updateSpawnPosition();
            
            this.scene.add(this.mesh);

            // Setup animations
            this.mixer = new THREE.AnimationMixer(gltf.scene);
            gltf.animations.forEach((clip) => {
                const name = clip.name.toLowerCase();
                if (name.includes('flapping') && !name.includes('water')) {
                    this.animations['flying'] = this.mixer.clipAction(clip);
                } else if (name.includes('duck_swim') || (name.includes('swim') && !name.includes('idle') && !name.includes('wash'))) {
                    this.animations['swim'] = this.mixer.clipAction(clip);
                } else if (name.includes('idle_swim')) {
                    this.animations['idle_swim'] = this.mixer.clipAction(clip);
                } else if (name.includes('idle') && !name.includes('swim')) {
                    this.animations['idle'] = this.mixer.clipAction(clip);
                } else if (name.includes('walk')) {
                    this.animations['walk'] = this.mixer.clipAction(clip);
                } else if (name.includes('run') && !name.includes('wing')) {
                    this.animations['run'] = this.mixer.clipAction(clip);
                }
            });

            // Fallback for missing animation mappings
            if (!this.animations['flying'] && gltf.animations.length > 0) {
                this.animations['flying'] = this.mixer.clipAction(gltf.animations[0]);
            }
            if (!this.animations['idle'] && gltf.animations.length > 0) {
                this.animations['idle'] = this.mixer.clipAction(gltf.animations[0]);
            }

            // Play initial swimming animation since it spawns in the pond
            if (this.animations['idle_swim']) {
                this.playAnimation('idle_swim');
            } else if (this.animations['idle']) {
                this.playAnimation('idle');
            }

            // Initialize controller with dependency injection
            this.controller = new DuckController(this.mesh, this.camera, getTerrainHeight);
            this.controller.groundOffset = this.groundOffset;
            this.controller.yOffset = this.yOffset;
            this.controller.setActive(this.active);

            this.updateSpawnPosition();
        });
    }

    updateSpawnPosition() {
        if (!this.mesh) return;
        const pondX = 25.0, pondZ = -20.0;
        const terrainY = getTerrainHeight(pondX, pondZ);
        const waterY = terrainY + 0.15;
        this.mesh.position.set(pondX, waterY + 0.1, pondZ);
        if (this.controller) {
            this.controller.isSwimming = true;
            this.controller.isGrounded = false;
            this.controller.yVelocity = 0;
        }
    }

    playAnimation(name) {
        const action = this.animations[name];
        if (!action || this.currentAction === action) return;
        
        if (this.currentAction) {
            action.reset().play();
            this.currentAction.crossFadeTo(action, 0.2, true);
        } else {
            action.play();
        }
        this.currentAction = action;
    }

    setActive(active) {
        this.active = active;
        if (this.controller) {
            this.controller.setActive(active);
        }
        if (!active) {
            if (this.controller && this.controller.isSwimming && this.animations['idle_swim']) {
                this.playAnimation('idle_swim');
            } else if (this.animations['idle']) {
                this.playAnimation('idle');
            }
        }
    }

    update(delta) {
        if (this.mixer) this.mixer.update(delta);
        if (!this.mesh || !this.controller) return;

        if (this.active) {
            // Update movement via Flight Controller
            this.controller.update(delta);

            // Handle movement animations
            if (this.controller.isSwimming) {
                const isMoving = this.controller.keys.w || this.controller.keys.a || this.controller.keys.s || this.controller.keys.d;
                if (isMoving) {
                    const swimAnim = this.animations['swim'] ? 'swim' : 'idle';
                    this.playAnimation(swimAnim);
                } else {
                    const idleSwimAnim = this.animations['idle_swim'] ? 'idle_swim' : 'idle';
                    this.playAnimation(idleSwimAnim);
                }
                if (this.mixer) this.mixer.timeScale = 1.0;
            } else if (this.controller.isGrounded) {
                const isMoving = this.controller.keys.w || this.controller.keys.a || this.controller.keys.s || this.controller.keys.d;
                if (isMoving) {
                    const moveAnim = this.animations['walk'] ? 'walk' : (this.animations['run'] ? 'run' : 'idle');
                    this.playAnimation(moveAnim);
                } else {
                    this.playAnimation('idle');
                }
                if (this.mixer) this.mixer.timeScale = 1.0;
            } else {
                // Airborne state -> flap wings!
                if (this.animations['flying']) {
                    this.playAnimation('flying');
                    if (this.mixer) {
                        if (this.controller.isTired) {
                            this.mixer.timeScale = 0.65;
                        } else {
                            this.mixer.timeScale = this.controller.yVelocity > 0 ? 1.8 : 0.9;
                        }
                    }
                }
            }
        } else {
            // If inactive, snap to terrain/water and play idle
            if (this.controller.isSwimming) {
                if (this.animations['idle_swim']) {
                    this.playAnimation('idle_swim');
                }
            } else {
                const terrainHeight = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
                const minAllowedY = terrainHeight + this.groundOffset + this.yOffset;
                if (this.mesh.position.y < minAllowedY) {
                    this.mesh.position.y = minAllowedY;
                }
                if (this.animations['idle']) {
                    this.playAnimation('idle');
                }
            }
            if (this.mixer) this.mixer.timeScale = 1.0;
        }
    }
}
