import * as THREE from 'three';
import { isObstacleInDirection } from './MathUtils.js';
import { ISLAND_BORDER_RADIUS, clampPositionToIsland } from './InvisibleBorder.js';
import { globalTelemetry } from '../services/telemetryService.js';

export class DuckController {
    constructor(duckMesh, camera, getTerrainHeightFn) {
        this.mesh = duckMesh;
        this.camera = camera;
        this.getTerrainHeight = getTerrainHeightFn;

        globalTelemetry.recordEvent('duck_controller_init', { timestamp: Date.now() });

        // --- Configuration Settings ---
        this.speed = 12.0;            // Horizontal movement speed
        this.gravity = -26.0;         // Downward gravity force
        this.jumpStrength = 12.0;     // Impulse applied when jumping from the ground
        this.normalFlapStrength = 9.0;
        this.normalMaxUpwardVel = 14.0;
        this.flapStrength = 9.0;      // Current impulse added per flap key press
        this.maxUpwardVelocity = 14.0; // Dynamic upward speed limit

        // Dynamic State
        this.yVelocity = 0.0;
        this.isGrounded = false;
        this.isSwimming = false;
        this.active = false;

        // Fatigue / Stamina System (Hidden)
        this.flightTime = 0.0;
        this.maxFlightDuration = 3.8; // Seconds of continuous powered flight before the duck must glide down
        this.isTired = false;

        // Offsets & Pond parameters
        this.groundOffset = 0.0;
        this.yOffset = 0.2;
        this.pondCenter = new THREE.Vector2(25.0, -20.0);
        this.pondRadius = 10.75;

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

            if (key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
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

        if (this.isGrounded || this.isSwimming) {
            // Take off from ground or water
            this.yVelocity = this.jumpStrength;
            this.isGrounded = false;
            this.isSwimming = false;
        } else {
            if (this.isTired) return;
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

        const prevX = this.mesh.position.x;
        const prevZ = this.mesh.position.z;
        const prevY = this.mesh.position.y;

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
            
            const targetAngle = Math.atan2(this._direction.x, this._direction.z);
            const currentRotation = this.mesh.rotation.y;
            let diff = targetAngle - currentRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.mesh.rotation.y += diff * 12.0 * delta;
        }

        // Apply horizontal speed (slightly slower in water)
        const currentSpeed = this.isSwimming ? this.speed * 0.65 : this.speed;
        this._velocity.copy(this._direction).multiplyScalar(currentSpeed * delta);

        if (isMoving) {
            const isBlocked = isObstacleInDirection(this.mesh.position, this._direction, 1.2);
            if (!isBlocked) {
                this.mesh.position.add(this._velocity);
            }
        }

        // Invisible border clamp around the island
        clampPositionToIsland(this.mesh.position, ISLAND_BORDER_RADIUS);

        // Check if Duck is inside the Pond Area
        const distToPond = Math.hypot(this.mesh.position.x - this.pondCenter.x, this.mesh.position.z - this.pondCenter.y);
        const inPondRegion = distToPond < this.pondRadius;

        // 2. Flight Fatigue (Hidden Stamina) System
        if (!this.isGrounded && !this.isSwimming) {
            // Accumulate flight time while airborne
            this.flightTime += delta;
            if (this.flightTime > this.maxFlightDuration) {
                this.isTired = true;
            }
        } else {
            // Recover stamina while resting on ground or swimming
            this.flightTime = Math.max(0.0, this.flightTime - delta * 2.8);
            if (this.flightTime <= 0.0) {
                this.isTired = false;
            }
        }

        // 3. Vertical Physics & Flight Ceiling (Allow flying to mountain tops up to Y=65)
        this.yVelocity += (this.isTired ? this.gravity * 1.3 : this.gravity) * delta;
        this.mesh.position.y += this.yVelocity * delta;

        // Max altitude ceiling (allow high mountain flights up to Y=65)
        if (this.mesh.position.y > 65.0) {
            this.mesh.position.y = 65.0;
            this.yVelocity = 0;
        }

        // 4. Ground vs Swimming Collision
        const terrainY = this.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        const floorY = Math.max(0.0, terrainY + this.groundOffset + this.yOffset);
        const pondWaterY = floorY + 0.1;

        if (inPondRegion && this.mesh.position.y <= pondWaterY + 0.5) {
            // Floating & Swimming on Pond Water!
            this.mesh.position.y = pondWaterY;
            this.yVelocity = 0.0;
            this.isSwimming = true;
            this.isGrounded = false;
        } else {
            this.isSwimming = false;

            if (this.isGrounded) {
                this.mesh.position.y = floorY;
                this.yVelocity = 0.0;
            } else {
                if (this.mesh.position.y <= floorY) {
                    this.mesh.position.y = floorY;
                    this.yVelocity = 0.0;
                    this.isGrounded = true;
                } else {
                    this.isGrounded = false;
                }
            }
        }
    }
}
