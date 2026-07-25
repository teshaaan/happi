import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeight, isObstacleInDirection } from './MathUtils.js';
import { ISLAND_BORDER_RADIUS, clampPositionToIsland } from './InvisibleBorder.js';

export class Fox {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        
        // Added spacebar mapping
        this.keys = { w: false, a: false, s: false, d: false, " ": false };
        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.speed = 12; // Slightly faster movement
        
        // Physics variables for jumping
        this.yVelocity = 0;
        this.gravity = -30;
        this.jumpStrength = 15;
        this.isGrounded = false;
        
        this.yOffset = 0.0;
        this.modelForwardOffset = 0.0;
        this.groundOffset = 0;
        this.active = true;

        this.initLoader();
        this.initControls();
    }

    initLoader() {
        const loader = new GLTFLoader();
        loader.load('/fox.glb', (gltf) => {
            this.mesh = gltf.scene;

            // Normalize imported models to a consistent in-world height.
            const rawBounds = new THREE.Box3().setFromObject(this.mesh);
            const rawSize = rawBounds.getSize(new THREE.Vector3());
            const targetHeight = 4;
            const scale = targetHeight / Math.max(rawSize.y, 0.001);
            this.mesh.scale.setScalar(scale);
            
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            const bounds = new THREE.Box3().setFromObject(this.mesh);
            this.groundOffset = Math.max(0, -bounds.min.y);

            // Spawn Fox at the Fox Den entrance (-32, 25)
            this.updateSpawnPosition();
            
            this.scene.add(this.mesh);
            this.mixer = new THREE.AnimationMixer(this.mesh);
            
            gltf.animations.forEach((clip) => {
                this.animations[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
            });
            
            if (this.animations['idle']) {
                this.playAnimation('idle');
            } else if (gltf.animations.length > 0) {
                this.currentAction = this.mixer.clipAction(gltf.animations[0]);
                this.currentAction.play();
            }
        });
    }

    updateSpawnPosition() {
        if (!this.mesh) return;
        const spawnX = -32.0, spawnZ = 25.0;
        const spawnY = getTerrainHeight(spawnX, spawnZ) + this.groundOffset + this.yOffset;
        this.mesh.position.set(spawnX, spawnY, spawnZ);
        this.isGrounded = true;
        this.yVelocity = 0;
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
        if (!active) {
            // Reset keys
            this.keys.w = false;
            this.keys.a = false;
            this.keys.s = false;
            this.keys.d = false;
            this.keys[" "] = false;
            this.velocity.set(0, 0, 0);
            this.direction.set(0, 0, 0);
            
            const idleAnim = this.animations['survey'] ? 'survey' : 'idle';
            if (idleAnim) {
                this.playAnimation(idleAnim);
            }
        }
    }

    initControls() {
        const resetKeys = () => {
            this.keys.w = false;
            this.keys.a = false;
            this.keys.s = false;
            this.keys.d = false;
            this.keys[" "] = false;
        };

        const handleKey = (e, isDown) => {
            if (!this.active) return;
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = isDown;
            }
        };

        window.addEventListener('keydown', (e) => handleKey(e, true));
        window.addEventListener('keyup', (e) => handleKey(e, false));
        window.addEventListener('blur', resetKeys);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) resetKeys();
        });
    }

    update(delta) {
        if (this.mixer) this.mixer.update(delta);
        if (!this.mesh) return;

        const isMoving = this.keys.w || this.keys.a || this.keys.s || this.keys.d;
        const prevX = this.mesh.position.x;
        const prevZ = this.mesh.position.z;
        const prevY = this.mesh.position.y;

        // 1. Horizontal Movement (X/Z) relative to camera direction
        this.direction.set(0, 0, 0);

        if (this.camera) {
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

            if (this.keys.w) this.direction.add(forward);
            if (this.keys.s) this.direction.sub(forward);
            if (this.keys.a) this.direction.sub(right);
            if (this.keys.d) this.direction.add(right);
        } else {
            if (this.keys.w) this.direction.z -= 1;
            if (this.keys.s) this.direction.z += 1;
            if (this.keys.a) this.direction.x -= 1;
            if (this.keys.d) this.direction.x += 1;
        }

        if (this.direction.lengthSq() > 0) {
            this.direction.normalize();
            
            const targetAngle = Math.atan2(this.direction.x, this.direction.z) + this.modelForwardOffset;
            
            const currentRotation = this.mesh.rotation.y;
            let diff = targetAngle - currentRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.mesh.rotation.y += diff * 12 * delta; 
        }

        this.velocity.copy(this.direction).multiplyScalar(this.speed * delta);
        
        // Prevent walking straight into steep rock walls/obstacles
        const isBlocked = isObstacleInDirection(this.mesh.position, this.direction, 1.2);
        if (!isBlocked) {
            this.mesh.position.add(this.velocity);
        } else {
            // Wall sliding on single axes if unblocked
            const tryX = new THREE.Vector3(this.velocity.x, 0, 0);
            const tryZ = new THREE.Vector3(0, 0, this.velocity.z);
            if (tryX.lengthSq() > 0 && !isObstacleInDirection(this.mesh.position, tryX.clone().normalize(), 1.0)) {
                this.mesh.position.add(tryX);
            } else if (tryZ.lengthSq() > 0 && !isObstacleInDirection(this.mesh.position, tryZ.clone().normalize(), 1.0)) {
                this.mesh.position.add(tryZ);
            }
        }

        // Invisible border clamp around the island
        clampPositionToIsland(this.mesh.position, ISLAND_BORDER_RADIUS);

        // Prevent Fox from entering the Pond (Fox cannot swim)
        const pondX = 25.0, pondZ = -20.0, pondRadius = 20.0;
        const distToPond = Math.hypot(this.mesh.position.x - pondX, this.mesh.position.z - pondZ);
        if (distToPond < pondRadius) {
            const angle = Math.atan2(this.mesh.position.z - pondZ, this.mesh.position.x - pondX);
            this.mesh.position.x = pondX + Math.cos(angle) * pondRadius;
            this.mesh.position.z = pondZ + Math.sin(angle) * pondRadius;
        }

        // 2. Vertical Movement & Physics (Jumping & Gravity)
        const terrainY = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        const floorY = Math.max(0.0, terrainY + this.yOffset + this.groundOffset);

        if (this.isGrounded && !this.keys[" "]) {
            this.mesh.position.y = floorY;
            this.yVelocity = 0;
        } else {
            this.yVelocity += this.gravity * delta;
            this.mesh.position.y += this.yVelocity * delta;

            if (this.mesh.position.y <= floorY) {
                this.mesh.position.y = floorY;
                this.yVelocity = 0;
                this.isGrounded = true;
            } else {
                this.isGrounded = false;
            }
        }

        // 4. Jump Trigger
        if (this.keys[" "] && this.isGrounded) {
            this.yVelocity = this.jumpStrength;
            this.isGrounded = false;
        }

        // Play run/idle animations. Uses 'survey' as the idle animation (since 'idle' is not in model clips)
        if (this.isGrounded) {
            const idleAnim = this.animations['survey'] ? 'survey' : 'idle';
            const moveAnim = this.animations['run'] ? 'run' : (this.animations['walk'] ? 'walk' : null);
            
            if (isMoving && moveAnim) {
                this.playAnimation(moveAnim);
            } else if (idleAnim) {
                this.playAnimation(idleAnim);
            }
        }
    }
}
