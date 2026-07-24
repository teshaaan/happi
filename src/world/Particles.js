import * as THREE from 'three';
import { getTerrainHeight } from './MathUtils.js';

export class Particles {
    constructor(scene, count = 4000) {
        this.scene = scene;
        this.count = count;

        const positions = new Float32Array(this.count * 3);
        this.scales = new Float32Array(this.count);
        this.phases = new Float32Array(this.count);
        this.speeds = new Float32Array(this.count);
        this.colors = new Float32Array(this.count * 3);
        this.velocities = []; 

        // Rich bioluminescent color palette: Warm Gold, Lime Bio-Glow, Amber Cyan
        const fireflyColors = [
            new THREE.Color('#ffd700'), // Gold
            new THREE.Color('#a3ff00'), // Lime bio-glow
            new THREE.Color('#ffb830'), // Warm Amber
            new THREE.Color('#5effd8'), // Soft Cyan-Gold
            new THREE.Color('#e0ff66'), // Soft Yellow-Green
        ];

        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3;
            const angle = Math.random() * Math.PI * 2;
            const radius = 4 + Math.pow(Math.random(), 0.7) * 160;
            const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 10;
            const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 10;
            
            // Hover near ground height (between 0.8m and 7.5m above local terrain surface)
            const terrainY = getTerrainHeight(x, z);
            const heightOffset = 0.8 + Math.random() * 6.5;

            positions[i3] = x;
            positions[i3 + 1] = terrainY + heightOffset;
            positions[i3 + 2] = z;

            this.scales[i] = 1.0 + Math.random() * 2.2;
            this.phases[i] = Math.random() * Math.PI * 2;
            this.speeds[i] = 1.2 + Math.random() * 2.5;

            const baseColor = fireflyColors[i % fireflyColors.length];
            this.colors[i3] = baseColor.r;
            this.colors[i3 + 1] = baseColor.g;
            this.colors[i3 + 2] = baseColor.b;

            this.velocities.push({
                x: (Math.random() - 0.5) * 0.012,
                y: (Math.random() - 0.5) * 0.006,
                z: (Math.random() - 0.5) * 0.012,
                baseY: terrainY + heightOffset
            });
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('aScale', new THREE.BufferAttribute(this.scales, 1));
        this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(this.phases, 1));
        this.geometry.setAttribute('aSpeed', new THREE.BufferAttribute(this.speeds, 1));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        // Shader with smooth multi-frequency pulsation and soft luminous radial core
        this.material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            uniforms: {
                uTime: { value: 0 },
                uMorningProgress: { value: 0.0 }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uMorningProgress;
                attribute float aScale;
                attribute float aPhase;
                attribute float aSpeed;
                varying vec3 vColor;
                varying float vTwinkle;
                varying float vAlpha;

                void main() {
                    vColor = color;
                    
                    // Natural multi-frequency breathing & twinkling pulse
                    float pulseA = sin(uTime * aSpeed * 2.2 + aPhase);
                    float pulseB = cos(uTime * 1.3 + aPhase * 1.7);
                    vTwinkle = smoothstep(-0.4, 0.95, pulseA * 0.7 + pulseB * 0.3);

                    // Fade out gracefully during Morning mode transition
                    vAlpha = (1.0 - uMorningProgress) * (0.4 + 0.6 * vTwinkle);

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float distanceScale = 1.0 / max(0.5, -mvPosition.z);
                    gl_PointSize = aScale * (42.0 * distanceScale);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vTwinkle;
                varying float vAlpha;

                void main() {
                    vec2 uv = gl_PointCoord - vec2(0.5);
                    float dist = length(uv);

                    // Soft luminous core with glowing outer halo
                    float core = smoothstep(0.14, 0.0, dist);
                    float glow = smoothstep(0.5, 0.08, dist);

                    vec3 color = vColor * (0.65 + vTwinkle * 0.85);
                    float alpha = (core * 0.95 + glow * 0.55) * vAlpha;
                    
                    if (alpha < 0.01) discard;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
        });

        this.mesh = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.mesh);
    }

    update(delta = 0.016) {
        this.material.uniforms.uTime.value += delta;
        const positions = this.geometry.attributes.position.array;
        const time = this.material.uniforms.uTime.value;

        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3;
            const v = this.velocities[i];

            // Organic drifting motion
            positions[i3] += v.x;
            positions[i3 + 2] += v.z;

            // Gentle vertical wave float relative to ground
            positions[i3 + 1] = v.baseY + Math.sin(this.phases[i] + time * this.speeds[i]) * 0.45;

            const x = positions[i3];
            const z = positions[i3 + 2];
            const radius = Math.hypot(x, z);

            // Re-spawn fireflies if they drift off bounds
            if (radius > 165) {
                const angle = Math.random() * Math.PI * 2;
                const resetRadius = 4 + Math.pow(Math.random(), 0.7) * 155;
                const newX = Math.cos(angle) * resetRadius;
                const newZ = Math.sin(angle) * resetRadius;
                const terrainY = getTerrainHeight(newX, newZ);
                const heightOffset = 0.8 + Math.random() * 6.5;

                positions[i3] = newX;
                positions[i3 + 1] = terrainY + heightOffset;
                positions[i3 + 2] = newZ;

                v.baseY = terrainY + heightOffset;
                v.x = (Math.random() - 0.5) * 0.012;
                v.z = (Math.random() - 0.5) * 0.012;
                this.phases[i] = Math.random() * Math.PI * 2;
            }
        }
        
        this.geometry.attributes.position.needsUpdate = true;
    }
}