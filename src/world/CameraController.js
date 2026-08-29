import * as THREE from 'three';
import { globalTelemetry } from '../services/telemetryService.js';

export class CameraController {
    constructor(camera, controls) {
        this.camera = camera;
        this.controls = controls;
        this.targetMesh = null;
        
        globalTelemetry.recordEvent('camera_controller_init', { timestamp: Date.now() });

        // 3rd Person offset: 12 units behind, 5 units above
        this.idealOffset = new THREE.Vector3(0, 4.8, 11.5); 
        this.idealLookAt = new THREE.Vector3(0, 1.5, 0);   
        
        this.isUserOrbiting = false;
        this.targetOffset = new THREE.Vector3(0, 1.5, 0);
        
        if (this.controls) {
            this.controls.addEventListener('start', () => { this.isUserOrbiting = true; });
            this.controls.addEventListener('end', () => { this.isUserOrbiting = false; });
        }
    }

    setTarget(mesh) {
        this.targetMesh = mesh;
    }

    update(delta) {
        if (!this.targetMesh) return;

        const charPos = this.targetMesh.position;

        if (this.isUserOrbiting) {
            // User is actively rotating the camera: target follows character position smoothly
            const desiredTarget = charPos.clone().add(this.targetOffset);
            this.controls.target.lerp(desiredTarget, 1.0 - Math.exp(-10.0 * delta));
            this.controls.update();
        } else {
            // 3rd Person Game Camera Tracking
            const desiredTarget = charPos.clone().add(this.targetOffset);
            
            // Smooth target follow (gives game-like camera spring lag when character starts moving)
            const targetDamping = 4.5;
            const targetLerp = 1.0 - Math.exp(-targetDamping * delta);
            this.controls.target.lerp(desiredTarget, targetLerp);

            // Compute camera position behind character based on character facing direction
            const offset = this.idealOffset.clone().applyQuaternion(this.targetMesh.quaternion);
            const desiredCamPos = charPos.clone().add(offset);

            // Smooth camera position follow
            const camDamping = 3.2;
            const camLerp = 1.0 - Math.exp(-camDamping * delta);
            this.camera.position.lerp(desiredCamPos, camLerp);

            // Max camera follow leash: if character runs far ahead, camera follows up to max distance
            const maxLeash = 18.0;
            const currentDist = this.camera.position.distanceTo(charPos);
            if (currentDist > maxLeash) {
                const dir = this.camera.position.clone().sub(charPos).normalize();
                this.camera.position.copy(charPos).add(dir.multiplyScalar(maxLeash));
            }

            this.controls.update();
        }
    }
}
