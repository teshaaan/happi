import * as THREE from 'three';

export class DuckController {
    constructor(duckMesh, camera, getTerrainHeightFn) {
        this.mesh = duckMesh;
        this.camera = camera;
        this.getTerrainHeight = getTerrainHeightFn;

        // --- Configuration Settings ---
        this.speed = 12.0;            // Horizontal movement speed
        this.gravity = -30.0;         // Downward gravity force
        this.jumpStrength = 12.0;     // Impulse applied when jumping from the ground
        this.flapStrength = 8.5;      // Impulse added per flap key press while airborne
        this.maxUpwardVelocity = 14.0; // Limits maximum ascent rate from rapid tapping

        // Dynamic State
        this.yVelocity = 0.0;
        this.isGrounded = false;
        this.active = false;

        // Offsets
        this.groundOffset = 0.0;
        this.yOffset = 0.2;

        // Inputs
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };

        this.initControls();
        this.initPreallocated();
    }

    /**
     * Pre-allocates vector math helpers to avoid garbage collection overhead in the render loop.
     */
    initPreallocated() {
        this._direction = new THREE.Vector3();
        this._velocity = new THREE.Vector3();
        this._forward = new THREE.Vector3();
        this._right = new THREE.Vector3();
        this._up = new THREE.Vector3(0, 1, 0);
    }

    initControls() {
        const handleKeyDown = (e) => {
            if (!this.active) return;
            const key = e.key.toLowerCase();

            // Detect space tap (transition from up to down) to trigger jumping/flapping
            if (key === ' ' || e.key === 'Spacebar') {
                e.preventDefault(); // Prevent page scrolling
                this.triggerFlap();
            }

            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = true;
            }
        };

        const handleKeyUp = (e) => {
            if (!this.active) return;
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', () => this.resetKeys());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.resetKeys();
        });
    }

    triggerFlap() {
        if (!this.mesh) return;

        if (this.isGrounded) {
            // Jump from the ground
            this.yVelocity = this.jumpStrength;
            this.isGrounded = false;
        } else {
            // Flap wings in the air to gain height
            this.yVelocity = Math.min(this.yVelocity + this.flapStrength, this.maxUpwardVelocity);
        }
    }

    setActive(active) {
        this.active = active;
        if (!active) {
            this.resetKeys();
        }
    }

    resetKeys() {
        for (const k in this.keys) {
            this.keys[k] = false;
        }
        this.yVelocity = 0.0;
    }

    update(delta) {
        if (!this.mesh) return;

        // 1. Horizontal Movement relative to the camera direction
        this._direction.set(0, 0, 0);

        if (this.camera) {
            this.camera.getWorldDirection(this._forward);
            this._forward.y = 0;
            this._forward.normalize();

            this._right.crossVectors(this._forward, this._up).normalize();

            if (this.keys.w) this._direction.add(this._forward);
            if (this.keys.s) this._direction.sub(this._forward);
            if (this.keys.a) this._direction.sub(this._right);
            if (this.keys.d) this._direction.add(this._right);
        }

        const isMoving = this._direction.lengthSq() > 0;

        if (isMoving) {
            this._direction.normalize();
            
            // Calculate target Y rotation angle
            const targetAngle = Math.atan2(this._direction.x, this._direction.z);
            
            // Interpolate mesh Y-rotation towards target angle
            const currentRotation = this.mesh.rotation.y;
            let diff = targetAngle - currentRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.mesh.rotation.y += diff * 12.0 * delta;
        }

        // Apply horizontal velocity
        this._velocity.copy(this._direction).multiplyScalar(this.speed * delta);
        this.mesh.position.add(this._velocity);

        // 2. Vertical Movement & Gravity
        this.yVelocity += this.gravity * delta;
        this.mesh.position.y += this.yVelocity * delta;

        // 3. Ground Collision & Heightmap snapping (with slope hysteresis to prevent micro-falling jitter)
        const terrainHeight = this.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        const floorY = terrainHeight + this.groundOffset + this.yOffset;
        const snapDistance = 0.25; // Snapping range to glue to descending slopes

        if (this.isGrounded && this.yVelocity <= 0.0) {
            if (this.mesh.position.y <= floorY + snapDistance) {
                this.mesh.position.y = floorY;
                this.yVelocity = 0.0;
                this.isGrounded = true;
            } else {
                this.isGrounded = false;
            }
        } else {
            if (this.mesh.position.y <= floorY) {
                this.mesh.position.y = floorY;
                this.yVelocity = 0.0;
                this.isGrounded = true;
            } else {
                this.isGrounded = false;
            }
        }

        // Force orientation upright (0 pitch and 0 roll)
        this.mesh.rotation.x = 0;
        this.mesh.rotation.z = 0;
    }
}
