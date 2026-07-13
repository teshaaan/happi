import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MathUtils.js';

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

        this.initLoader();
        this.initControls();
    }

    initLoader() {
        const loader = new GLTFLoader();
        loader.load('/fox.glb', (gltf) => {
            this.mesh = gltf.scene;
            this.mesh.scale.set(0.05, 0.05, 0.05); 
            
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            const bounds = new THREE.Box3().setFromObject(this.mesh);
            this.groundOffset = Math.max(0, -bounds.min.y);
            
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

    initControls() {
        const resetKeys = () => {
            this.keys.w = false;
            this.keys.a = false;
            this.keys.s = false;
            this.keys.d = false;
            this.keys[" "] = false;
        };

        const handleKey = (e, isDown) => {
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
        this.mesh.position.add(this.velocity);

        // 2. Vertical Movement & Physics (Jumping & Gravity)
        const terrainHeight = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        const floorY = terrainHeight + this.yOffset + this.groundOffset;

        // If the fox was grounded and didn't jump, snap it to the slope
        if (this.isGrounded && !this.keys[" "]) {
            this.mesh.position.y = floorY;
            this.yVelocity = 0;
        } else {
            this.yVelocity += this.gravity * delta;
            this.mesh.position.y += this.yVelocity * delta;

            // 3. Ground Collision
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