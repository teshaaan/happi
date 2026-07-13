import * as THREE from 'three';

export class CameraController {
    constructor(camera, targetMesh) {
        this.camera = camera;
        this.targetMesh = targetMesh;
        
        // Adjusted for a true 3rd Person View
        // Place the camera 8 units BEHIND (+Z) and 4 units ABOVE (+Y) the Fox
        this.idealOffset = new THREE.Vector3(0, 4, 8); 
        // Look slightly AHEAD (-Z) of the Fox so it sits comfortably in the bottom third of the screen
        this.idealLookAt = new THREE.Vector3(0, 1, -5);   
        
        this.currentPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();

        this.tempPos = new THREE.Vector3();
        this.tempLook = new THREE.Vector3();
    }

    update(delta) {
        if (!this.targetMesh) return;

        this.tempPos.copy(this.idealOffset);
        this.tempPos.applyQuaternion(this.targetMesh.quaternion);
        this.tempPos.add(this.targetMesh.position);

        this.tempLook.copy(this.idealLookAt);
        this.tempLook.applyQuaternion(this.targetMesh.quaternion);
        this.tempLook.add(this.targetMesh.position);

        const damping = 5.0; // Slightly stiffer damping for better 3rd person control
        const lerpFactor = 1.0 - Math.exp(-damping * delta);
        
        this.currentPosition.lerp(this.tempPos, lerpFactor);
        this.currentLookAt.lerp(this.tempLook, lerpFactor);

        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
    }
}