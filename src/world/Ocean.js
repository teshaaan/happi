import * as THREE from 'three';

export class Ocean {
    constructor(scene, size = 1400, seaLevel = -0.4) {
        this.scene = scene;
        this.size = size;
        this.seaLevel = seaLevel;

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.time = { value: 0 };
        this.waterShader = null;

        this.createLowPolyWater();
        this.createShoreFoam();
    }

    createLowPolyWater() {
        // Low-Poly plane with high segment density for faceted wave details
        const geometry = new THREE.PlaneGeometry(this.size, this.size, 140, 140);

        // Low-poly water material with smooth specular highlights & flat shading
        this.material = new THREE.MeshStandardMaterial({
            color: '#156294',
            roughness: 0.18,
            metalness: 0.25,
            flatShading: true,
            transparent: true,
            opacity: 0.92,
            side: THREE.DoubleSide
        });

        // Custom GPU shader for dynamic low-poly ocean waves
        this.material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.time;
            this.waterShader = shader;

            shader.vertexShader = `
                uniform float uTime;
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                vec3 transformed = vec3(position);
                
                // Low-poly multi-wave height displacement
                float wave1 = sin(transformed.x * 0.04 + uTime * 1.1) * 0.6;
                float wave2 = cos(transformed.y * 0.04 + uTime * 0.9) * 0.5;
                float wave3 = sin((transformed.x + transformed.y) * 0.025 + uTime * 0.7) * 0.4;
                float wave4 = cos(sqrt(transformed.x * transformed.x + transformed.y * transformed.y) * 0.03 - uTime * 0.8) * 0.35;
                
                transformed.z += wave1 + wave2 + wave3 + wave4;
                `
            );
        };

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(0, this.seaLevel, 0);
        this.mesh.receiveShadow = true;
        this.group.add(this.mesh);
    }

    createShoreFoam() {
        // Low-poly foam ring circling the island shoreline
        const innerRadius = 152;
        const outerRadius = 166;
        const foamGeo = new THREE.RingGeometry(innerRadius, outerRadius, 64, 4);

        const foamMat = new THREE.MeshStandardMaterial({
            color: '#d4f2ff',
            roughness: 0.4,
            metalness: 0.1,
            flatShading: true,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        });

        this.foamMesh = new THREE.Mesh(foamGeo, foamMat);
        this.foamMesh.rotation.x = -Math.PI / 2;
        this.foamMesh.position.set(0, this.seaLevel + 0.1, 0);
        this.group.add(this.foamMesh);
    }

    setMorningProgress(t) {
        if (!this.material) return;
        const nightColor = new THREE.Color('#104068');
        const morningColor = new THREE.Color('#00b4d8');
        this.material.color.copy(nightColor).lerp(morningColor, t);
    }

    update(delta) {
        this.time.value += delta;
        
        // Gentle bobbing effect for the shoreline foam ring
        if (this.foamMesh) {
            this.foamMesh.position.y = this.seaLevel + 0.1 + Math.sin(this.time.value * 1.5) * 0.08;
            this.foamMesh.rotation.z = this.time.value * 0.015;
        }
    }
}
