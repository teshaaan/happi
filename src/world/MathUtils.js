import * as THREE from 'three';

const terrainMeshes = [];
const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3(0, -1, 0);

const wallRaycaster = new THREE.Raycaster();
const wallRayOrigin = new THREE.Vector3();

export function registerTerrainMesh(mesh) {
    if (mesh && !terrainMeshes.includes(mesh)) {
        terrainMeshes.push(mesh);
    }
}

export function unregisterTerrainMesh(mesh) {
    const idx = terrainMeshes.indexOf(mesh);
    if (idx !== -1) {
        terrainMeshes.splice(idx, 1);
    }
}

export function clearTerrainMeshes() {
    terrainMeshes.length = 0;
}

export function fallbackTerrainHeight(x, z) {
    return -0.4;
}

/**
 * Returns the exact top surface height of the 3D landscape (hills, mountains, paths) at (x, z).
 */
export function getTerrainHeight(x, z) {
    if (terrainMeshes.length > 0) {
        rayOrigin.set(x, 250, z);
        raycaster.set(rayOrigin, rayDirection);
        const intersects = raycaster.intersectObjects(terrainMeshes, true);
        
        if (intersects.length > 0) {
            // Return top-most surface elevation at (x, z)
            return intersects[0].point.y;
        }
    }
    return fallbackTerrainHeight(x, z);
}

/**
 * Checks if there is a steep rock or wall obstacle in the movement direction.
 */
export function isObstacleInDirection(pos, direction, checkDistance = 1.2) {
    if (terrainMeshes.length === 0 || direction.lengthSq() === 0) return false;
    
    wallRayOrigin.copy(pos);
    wallRayOrigin.y += 0.6; // Torso height
    
    wallRaycaster.set(wallRayOrigin, direction);
    wallRaycaster.far = checkDistance;
    
    const hits = wallRaycaster.intersectObjects(terrainMeshes, true);
    if (hits.length > 0) {
        const hit = hits[0];
        const normY = hit.face ? Math.abs(hit.face.normal.y) : 1.0;
        if (normY < 0.65) {
            return true;
        }
    }
    return false;
}