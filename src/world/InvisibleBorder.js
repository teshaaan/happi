import * as THREE from 'three';

export const ISLAND_BORDER_RADIUS = 160.0;

export class InvisibleBorder {
    constructor(scene, radius = ISLAND_BORDER_RADIUS, height = 120.0) {
        this.scene = scene;
        this.radius = radius;
        this.height = height;

        // Invisible wall geometry around the island perimeter
        const geometry = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);
        const material = new THREE.MeshBasicMaterial({
            visible: false,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, height / 2 - 10, 0);
        this.scene.add(this.mesh);
    }
}

/**
 * Clamps a vector position inside the island's invisible boundary.
 */
export function clampPositionToIsland(position, maxRadius = ISLAND_BORDER_RADIUS) {
    const currentDist = Math.hypot(position.x, position.z);
    if (currentDist > maxRadius) {
        const angle = Math.atan2(position.z, position.x);
        position.x = Math.cos(angle) * maxRadius;
        position.z = Math.sin(angle) * maxRadius;
        return true;
    }
    return false;
}
