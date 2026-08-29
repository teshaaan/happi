import * as THREE from 'three';
import { globalTelemetry } from '../services/telemetryService.js';

export const ISLAND_BORDER_RADIUS = 160.0;

export function getIslandBoundaryRadius(angle, baseRadius = ISLAND_BORDER_RADIUS) {
    return baseRadius
        + Math.sin(angle * 3.0 + 0.8) * 9.0
        + Math.sin(angle * 5.0 - 1.7) * 5.5
        + Math.cos(angle * 8.0 + 0.4) * 3.5;
}

export class InvisibleBorder {
    constructor(scene, radius = ISLAND_BORDER_RADIUS, height = 120.0) {
        this.scene = scene;
        this.radius = radius;
        this.height = height;

        globalTelemetry.recordEvent('border_init', { radius, height });

        // Invisible organic wall geometry around the island perimeter.
        const segments = 96;
        const vertices = [];
        const indices = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const r = getIslandBoundaryRadius(angle, radius);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            vertices.push(x, -10, z, x, height - 10, z);
        }

        for (let i = 0; i < segments; i++) {
            const a = i * 2;
            indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const material = new THREE.MeshBasicMaterial({
            visible: false,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }
}

/**
 * Clamps a vector position inside the island's invisible boundary.
 */
export function clampPositionToIsland(position, maxRadius = ISLAND_BORDER_RADIUS) {
    const currentDist = Math.hypot(position.x, position.z);
    const angle = Math.atan2(position.z, position.x);
    const boundaryRadius = getIslandBoundaryRadius(angle, maxRadius);
    if (currentDist > boundaryRadius) {
        position.x = Math.cos(angle) * boundaryRadius;
        position.z = Math.sin(angle) * boundaryRadius;
        return true;
    }
    return false;
}
