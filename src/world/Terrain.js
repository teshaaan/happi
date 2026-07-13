import * as THREE from 'three';

export class Terrain {
    constructor() {
        this.time = { value: 0 };

        this.geometry = new THREE.PlaneGeometry(160, 160, 160, 160);
        this.material = new THREE.MeshStandardMaterial({
            color: '#315f3b',
            roughness: 1,
            metalness: 0,
            flatShading: true,
        });

        this.material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.time;

            shader.vertexShader = `
                uniform float uTime;
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                vec3 transformed = vec3(position);
                float waveA = sin(transformed.x * 0.12 + uTime * 1.4) * 1.5;
                float waveB = cos(transformed.y * 0.16 + uTime * 0.9) * 1.0;
                transformed.z += waveA + waveB;
                `
            );
        };

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = true;
    }

    update(delta) {
        this.time.value += delta * 1.25;
    }
}