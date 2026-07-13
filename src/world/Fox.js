import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MathUtils.js';

export class Fox {
    constructor(scene) {
        this.scene = scene;
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
        
        // Offset to prevent the fox from being cut in half (Tweak this based on your specific model size)
        this.yOffset = 1.0; 

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
        const handleKey = (e, isDown) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = isDown;
                const isMoving = this.keys.w || this.keys.a || this.keys.s || this.keys.d;
                
                // Play run/walk animation if grounded and moving
                if (this.isGrounded) {
                    if (this.animations['walk'] || this.animations['run']) {
                        const moveAnim = this.animations['run'] ? 'run' : 'walk';
                        this.playAnimation(isMoving ? moveAnim : 'idle');
                    }
                }
            }
        };

        window.addEventListener('keydown', (e) => handleKey(e, true));
        window.addEventListener('keyup', (e) => handleKey(e, false));
    }

    update(delta) {
        if (this.mixer) this.mixer.update(delta);
        if (!this.mesh) return;

        // 1. Horizontal Movement (X/Z)
        this.direction.set(0, 0, 0);
        if (this.keys.w) this.direction.z -= 1; // Forward is -Z
        if (this.keys.s) this.direction.z += 1;
        if (this.keys.a) this.direction.x -= 1;
        if (this.keys.d) this.direction.x += 1;

        if (this.direction.lengthSq() > 0) {
            this.direction.normalize();
            
            // Added Math.PI rotation offset to force the Fox to face forward correctly
            const targetAngle = Math.atan2(this.direction.x, this.direction.z) + Math.PI;
            
            const currentRotation = this.mesh.rotation.y;
            let diff = targetAngle - currentRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.mesh.rotation.y += diff * 12 * delta; 
        }

        this.velocity.copy(this.direction).multiplyScalar(this.speed * delta);
        this.mesh.position.add(this.velocity);

        // 2. Vertical Movement & Physics (Jumping & Gravity)
        this.yVelocity += this.gravity * delta; // Apply gravity every frame
        this.mesh.position.y += this.yVelocity * delta; // Apply velocity to position

        // 3. Ground Collision
        const terrainHeight = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        const floorY = terrainHeight + this.yOffset; // Use offset to stop clipping

        if (this.mesh.position.y <= floorY) {
            // Fox hit the ground
            this.mesh.position.y = floorY;
            this.yVelocity = 0;
            this.isGrounded = true;
            
            // Reset to idle/run if we just landed
            const isMoving = this.keys.w || this.keys.a || this.keys.s || this.keys.d;
            if (!isMoving) this.playAnimation('idle');
        } else {
            this.isGrounded = false;
        }

        // 4. Jump Trigger
        if (this.keys[" "] && this.isGrounded) {
            this.yVelocity = this.jumpStrength;
            this.isGrounded = false;
        }
    }
}