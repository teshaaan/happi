import * as THREE from 'three';

export class Particles {
    constructor(scene, count = 2000) {
        this.scene = scene;
        this.count = count;

        const positions = new Float32Array(this.count * 3);
        this.scales = new Float32Array(this.count);
        this.phases = new Float32Array(this.count);
        this.colors = new Float32Array(this.count * 3);
        this.velocities = []; 

        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3;
            const angle = Math.random() * Math.PI * 2;
            const radius = 8 + Math.random() * 42;
            const height = 0.6 + Math.random() * 7.5;

            positions[i3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 8;
            positions[i3 + 1] = height;
            positions[i3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 8;

            this.scales[i] = 0.7 + Math.random() * 1.8;
            this.phases[i] = Math.random() * Math.PI * 2;

            const color = new THREE.Color().setHSL(0.12 + Math.random() * 0.05, 0.95, 0.58 + Math.random() * 0.14);
            this.colors[i3] = color.r;
            this.colors[i3 + 1] = color.g;
            this.colors[i3 + 2] = color.b;

            this.velocities.push({
                x: (Math.random() - 0.5) * 0.008,
                y: (Math.random() - 0.5) * 0.004,
                z: (Math.random() - 0.5) * 0.008
            });
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('aScale', new THREE.BufferAttribute(this.scales, 1));
        this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(this.phases, 1));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        this.material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            uniforms: {
                uTime: { value: 0 },
            },
            vertexShader: `
                uniform float uTime;
                attribute float aScale;
                attribute float aPhase;
                varying vec3 vColor;
                varying float vTwinkle;

                void main() {
                    vColor = color;
                    vTwinkle = 0.55 + 0.45 * sin(uTime * 2.3 + aPhase);

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float distanceScale = 1.0 / max(0.6, -mvPosition.z);
                    gl_PointSize = aScale * (30.0 * distanceScale);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vTwinkle;

                void main() {
                    vec2 uv = gl_PointCoord - vec2(0.5);
                    float dist = length(uv);
                    float core = smoothstep(0.18, 0.0, dist);
                    float glow = smoothstep(0.5, 0.15, dist);

                    vec3 color = vColor * (0.5 + vTwinkle * 0.85);
                    float alpha = (core * 0.95 + glow * 0.5) * vTwinkle;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
        });

        this.mesh = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.mesh);
    }

    // Called every frame in the animation loop
    update(delta = 0.016) {
        this.material.uniforms.uTime.value += delta;
        const positions = this.geometry.attributes.position.array;
        
        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3;
            const v = this.velocities[i];

            positions[i3] += v.x;
            positions[i3 + 1] += v.y;
            positions[i3 + 2] += v.z;

            positions[i3 + 1] += Math.sin(this.phases[i] + this.material.uniforms.uTime.value * 1.6) * 0.0015;

            const x = positions[i3];
            const y = positions[i3 + 1];
            const z = positions[i3 + 2];
            const radius = Math.sqrt(x * x + z * z);

            if (radius > 55 || y < 0.45 || y > 9.5) {
                const angle = Math.random() * Math.PI * 2;
                const resetRadius = 10 + Math.random() * 40;

                positions[i3] = Math.cos(angle) * resetRadius;
                positions[i3 + 1] = 0.6 + Math.random() * 7.0;
                positions[i3 + 2] = Math.sin(angle) * resetRadius;

                v.x = (Math.random() - 0.5) * 0.008;
                v.y = (Math.random() - 0.5) * 0.004;
                v.z = (Math.random() - 0.5) * 0.008;
                this.phases[i] = Math.random() * Math.PI * 2;
            }
        }
        
        this.geometry.attributes.position.needsUpdate = true;
    }
}