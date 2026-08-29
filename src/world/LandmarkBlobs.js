import * as THREE from 'three';
import { getTerrainHeight } from './MathUtils.js';
import { globalTelemetry } from '../services/telemetryService.js';

const LANDMARK_CLUSTERS = [
    { x: 11.66, z: 88.35, color: '#76ff5f', count: 42, radius: 8.2, height: 9.2 }, // tree stump
    { x: 83.73, z: -53.62, color: '#ff78c8', count: 46, radius: 9.0, height: 10.5 }, // cherry tree
    { x: 38.63, z: -92.32, color: '#55aaff', count: 42, radius: 8.2, height: 9.2 }, // stylized rock
    { x: -60.99, z: -41.00, color: '#ffd447', count: 24, radius: 5.2, height: 7.4 }, // shrine 1
    { x: -71.38, z: -23.00, color: '#ffd447', count: 24, radius: 5.2, height: 7.4 }, // shrine 2
    { x: -50.60, z: -23.00, color: '#ffd447', count: 24, radius: 5.2, height: 7.4 }, // shrine 3
];

export class LandmarkBlobs {
    constructor(scene) {
        this.scene = scene;
        this.points = [];
        this.phase = [];
        this.baseY = [];
        this.heightOffset = [];
        this.floatAmp = [];

        globalTelemetry.recordEvent('landmark_blobs_construct', { clusterCount: LANDMARK_CLUSTERS.length });
        this.floatSpeed = [];

        const count = LANDMARK_CLUSTERS.reduce((total, cluster) => total + cluster.count, 0);
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const scales = new Float32Array(count);
        const color = new THREE.Color();

        let cursor = 0;
        LANDMARK_CLUSTERS.forEach((cluster) => {
            color.set(cluster.color);
            const terrainY = getTerrainHeight(cluster.x, cluster.z);

            for (let i = 0; i < cluster.count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * cluster.radius;
                const x = cluster.x + Math.cos(angle) * r;
                const z = cluster.z + Math.sin(angle) * r;
                const heightOffset = 1.0 + Math.random() * cluster.height;
                const y = terrainY + heightOffset;
                const i3 = cursor * 3;

                positions[i3] = x;
                positions[i3 + 1] = y;
                positions[i3 + 2] = z;
                colors[i3] = color.r;
                colors[i3 + 1] = color.g;
                colors[i3 + 2] = color.b;
                scales[cursor] = 3.0 + Math.random() * 2.2;

                this.points.push({ cluster, offsetX: x - cluster.x, offsetZ: z - cluster.z });
                this.phase[cursor] = Math.random() * Math.PI * 2;
                this.heightOffset[cursor] = heightOffset;
                this.baseY[cursor] = y;
                this.floatAmp[cursor] = 0.28 + Math.random() * 0.42;
                this.floatSpeed[cursor] = 0.42 + Math.random() * 0.5;
                cursor += 1;
            }
        });

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

        this.material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uTime: { value: 0 }
            },
            vertexShader: `
                uniform float uTime;
                attribute float aScale;
                varying vec3 vColor;
                varying float vPulse;

                void main() {
                    vColor = color;
                    vPulse = 0.78 + sin(uTime * 1.15 + aScale * 2.4) * 0.18;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float distanceScale = 1.0 / max(0.5, -mvPosition.z);
                    gl_PointSize = aScale * (112.0 * distanceScale);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vPulse;

                void main() {
                    vec2 uv = gl_PointCoord - vec2(0.5);
                    float dist = length(uv);
                    float core = smoothstep(0.15, 0.0, dist);
                    float glow = smoothstep(0.5, 0.04, dist);
                    float alpha = core * 1.0 + glow * 0.58;

                    if (alpha < 0.01) discard;
                    gl_FragColor = vec4(vColor * (1.05 + vPulse * 0.55), alpha * vPulse);
                }
            `
        });

        this.mesh = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.mesh);
    }

    updatePosition() {
        const positions = this.geometry.attributes.position.array;

        this.points.forEach((point, index) => {
            const i3 = index * 3;
            const x = point.cluster.x + point.offsetX;
            const z = point.cluster.z + point.offsetZ;
            const terrainY = getTerrainHeight(point.cluster.x, point.cluster.z);

            positions[i3] = x;
            positions[i3 + 2] = z;
            this.baseY[index] = terrainY + this.heightOffset[index];
        });

        this.geometry.attributes.position.needsUpdate = true;
    }

    update(delta) {
        this.material.uniforms.uTime.value += delta;
        const positions = this.geometry.attributes.position.array;
        const time = this.material.uniforms.uTime.value;

        for (let i = 0; i < this.points.length; i++) {
            positions[i * 3 + 1] = this.baseY[i] + Math.sin(time * this.floatSpeed[i] + this.phase[i]) * this.floatAmp[i];
        }

        this.geometry.attributes.position.needsUpdate = true;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.geometry.dispose();
        this.material.dispose();
    }
}
