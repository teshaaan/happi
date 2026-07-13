import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;

        // Colors for states
        this.skyColor = '#050816';
        this.horizonColor = '#101733';
        this.groundColor = '#05050f';

        // Transition variables
        this.targetMode = 'night'; // Default is night
        this.transitionProgress = 0.0; // 0.0 = night, 1.0 = morning
        this.transitionDuration = 1.8; // seconds

        this.setupAtmosphere();
        this.setupSkyDome();
        this.setupLights();
        this.setupMoon();
        this.setupSun();
        this.setupClouds();
    }

    setupAtmosphere() {
        this.scene.background = new THREE.Color(this.skyColor);
        this.scene.fog = new THREE.FogExp2(this.skyColor, 0.017);
    }

    createCanvasTexture(drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;

        const context = canvas.getContext('2d');
        drawFn(context, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    setupSkyDome() {
        // 1. Night sky dome (with stars)
        const nightTexture = this.createCanvasTexture((context, width, height) => {
            const gradient = context.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#03050c');
            gradient.addColorStop(0.55, '#050816');
            gradient.addColorStop(1, '#101733');

            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);

            context.globalAlpha = 0.28;
            for (let i = 0; i < 150; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height * 0.75;
                const radius = Math.random() * 1.5 + 0.4;
                context.fillStyle = '#ffffff';
                context.beginPath();
                context.arc(x, y, radius, 0, Math.PI * 2);
                context.fill();
            }
            context.globalAlpha = 1.0;
        });

        this.nightDome = new THREE.Mesh(
            new THREE.SphereGeometry(280, 48, 32),
            new THREE.MeshBasicMaterial({ 
                map: nightTexture, 
                side: THREE.BackSide,
                transparent: true,
                opacity: 1.0,
                depthWrite: false
            })
        );
        this.scene.add(this.nightDome);

        // 2. Morning sky dome (warm sunrise gradient)
        const morningTexture = this.createCanvasTexture((context, width, height) => {
            const gradient = context.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#3672d6'); // sky blue
            gradient.addColorStop(0.55, '#6da1f8'); // light sky blue
            gradient.addColorStop(1, '#ffd699'); // warm peach sunrise horizon

            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);
        });

        this.morningDome = new THREE.Mesh(
            new THREE.SphereGeometry(279, 48, 32), // Sit slightly inside
            new THREE.MeshBasicMaterial({ 
                map: morningTexture, 
                side: THREE.BackSide,
                transparent: true,
                opacity: 0.0,
                depthWrite: false
            })
        );
        this.scene.add(this.morningDome);
    }

    setupLights() {
        this.hemiLight = new THREE.HemisphereLight('#36507b', this.groundColor, 0.28);
        this.scene.add(this.hemiLight);

        // Moonlight
        this.moonLight = new THREE.DirectionalLight('#c8d8ff', 0.95);
        this.moonLight.position.set(30, 42, -36);
        this.moonLight.castShadow = true;
        this.moonLight.shadow.mapSize.width = 1024;
        this.moonLight.shadow.mapSize.height = 1024;
        const shadowSize = 30;
        this.moonLight.shadow.camera.left = -shadowSize;
        this.moonLight.shadow.camera.right = shadowSize;
        this.moonLight.shadow.camera.top = shadowSize;
        this.moonLight.shadow.camera.bottom = -shadowSize;
        this.moonLight.shadow.camera.near = 0.5;
        this.moonLight.shadow.camera.far = 100;

        this.scene.add(this.moonLight);
    }

    setupMoon() {
        const moonTexture = this.createCanvasTexture((context, width, height) => {
            const radius = width / 2;
            const gradient = context.createRadialGradient(
                radius * 0.42,
                radius * 0.38,
                radius * 0.2,
                radius,
                radius,
                radius
            );

            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.4, '#fff9e6');
            gradient.addColorStop(0.75, '#dad5c7');
            gradient.addColorStop(1, '#a19d92');
            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);

            const craterColors = ['#c2bdb0', '#9c9a8f', '#dbd6c8', '#b5b0a3'];
            for (let i = 0; i < 70; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const craterRadius = Math.random() * 18 + 4;
                const crater = context.createRadialGradient(x - craterRadius * 0.25, y - craterRadius * 0.25, craterRadius * 0.2, x, y, craterRadius);
                crater.addColorStop(0, craterColors[i % craterColors.length]);
                crater.addColorStop(1, 'rgba(60, 60, 60, 0.05)');
                context.fillStyle = crater;
                context.beginPath();
                context.arc(x, y, craterRadius, 0, Math.PI * 2);
                context.fill();
            }

            const lighting = context.createRadialGradient(radius * 0.38, radius * 0.32, radius * 0.1, radius, radius, radius);
            lighting.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            lighting.addColorStop(0.4, 'rgba(255, 255, 255, 0.35)');
            lighting.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
            context.fillStyle = lighting;
            context.fillRect(0, 0, width, height);
        });

        // Larger sphere size for better visibility: 6.5 instead of 4.2
        this.moon = new THREE.Mesh(
            new THREE.SphereGeometry(6.5, 48, 48),
            new THREE.MeshBasicMaterial({
                map: moonTexture,
                fog: false,
            })
        );
        this.moon.position.copy(this.moonLight.position);

        const glowTexture = this.createCanvasTexture((context, width, height) => {
            const radius = width / 2;
            const glow = context.createRadialGradient(radius, radius, radius * 0.06, radius, radius, radius);
            glow.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
            glow.addColorStop(0.25, 'rgba(195, 215, 255, 0.42)');
            glow.addColorStop(0.7, 'rgba(130, 160, 240, 0.15)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            context.fillStyle = glow;
            context.fillRect(0, 0, width, height);
        });

        // Expanded glow size: 32 instead of 18
        this.moonGlow = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: glowTexture,
                color: '#dce7ff',
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false,
            })
        );
        this.moonGlow.position.copy(this.moon.position);
        this.moonGlow.scale.set(32, 32, 1);

        this.scene.add(this.moon);
        this.scene.add(this.moonGlow);
    }

    setupSun() {
        // Sunlight Directional Light
        this.sunLight = new THREE.DirectionalLight('#fffaed', 0.0); // Starts off
        this.sunLight.position.set(-36, 46, 30); // Placed opposite to the moon
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        const shadowSize = 30;
        this.sunLight.shadow.camera.left = -shadowSize;
        this.sunLight.shadow.camera.right = shadowSize;
        this.sunLight.shadow.camera.top = shadowSize;
        this.sunLight.shadow.camera.bottom = -shadowSize;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 100;

        this.scene.add(this.sunLight);

        // Sun mesh texture
        const sunTexture = this.createCanvasTexture((context, width, height) => {
            const radius = width / 2;
            const gradient = context.createRadialGradient(
                radius * 0.42,
                radius * 0.38,
                radius * 0.1,
                radius,
                radius,
                radius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.35, '#fffae0');
            gradient.addColorStop(0.8, '#ffeaad');
            gradient.addColorStop(1, '#ffc766');
            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);
        });

        this.sun = new THREE.Mesh(
            new THREE.SphereGeometry(6.0, 48, 48),
            new THREE.MeshBasicMaterial({
                map: sunTexture,
                fog: false,
            })
        );
        this.sun.position.copy(this.sunLight.position);
        this.sun.scale.setScalar(0.001); // Hide initially

        // Sun glow texture
        const glowTexture = this.createCanvasTexture((context, width, height) => {
            const radius = width / 2;
            const glow = context.createRadialGradient(radius, radius, radius * 0.08, radius, radius, radius);
            glow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            glow.addColorStop(0.2, 'rgba(255, 220, 150, 0.65)');
            glow.addColorStop(0.6, 'rgba(255, 160, 80, 0.18)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            context.fillStyle = glow;
            context.fillRect(0, 0, width, height);
        });

        this.sunGlow = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: glowTexture,
                color: '#ffe5b4',
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false,
            })
        );
        this.sunGlow.position.copy(this.sun.position);
        this.sunGlow.scale.set(45, 45, 1);
        this.sunGlow.scale.setScalar(0.001); // Hide initially

        this.scene.add(this.sun);
        this.scene.add(this.sunGlow);
    }

    setupClouds() {
        this.clouds = new THREE.Group();
        this.scene.add(this.clouds);

        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: '#fbfbfb',
            roughness: 0.95,
            metalness: 0.05,
            flatShading: true,
        });

        const cloudPositions = [
            { x: -35, y: 18, z: -25, scale: 1.2 },
            { x: -15, y: 22, z: -40, scale: 1.5 },
            { x: 20, y: 16, z: -30, scale: 1.0 },
            { x: 45, y: 24, z: -15, scale: 1.4 },
            { x: -50, y: 20, z: 20, scale: 1.3 },
            { x: 10, y: 25, z: 45, scale: 1.6 },
            { x: 35, y: 19, z: 15, scale: 1.1 },
            { x: -20, y: 23, z: 35, scale: 1.4 },
        ];

        cloudPositions.forEach((pos) => {
            const cloud = new THREE.Group();
            const numPuffs = 4 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numPuffs; i++) {
                const radius = 1.2 + Math.random() * 1.6;
                const geom = new THREE.SphereGeometry(radius, 8, 8);
                const mesh = new THREE.Mesh(geom, cloudMaterial);
                mesh.position.set(
                    (Math.random() - 0.5) * 3.5,
                    (Math.random() - 0.5) * 1.2,
                    (Math.random() - 0.5) * 2.5
                );
                mesh.scale.set(1.4, 0.75, 1.1);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                cloud.add(mesh);
            }
            cloud.position.set(pos.x, pos.y, pos.z);
            cloud.scale.setScalar(pos.scale);
            cloud.userData = { baseScale: pos.scale };
            this.clouds.add(cloud);
        });

        this.clouds.scale.setScalar(0.001); // Hide initially
    }

    update(delta) {
        // Transition theme interpolator
        if (this.targetMode === 'morning') {
            this.transitionProgress = Math.min(1.0, this.transitionProgress + delta / this.transitionDuration);
        } else {
            this.transitionProgress = Math.max(0.0, this.transitionProgress - delta / this.transitionDuration);
        }

        const t = this.transitionProgress;

        // 1. Sky Domes opacity crossfade
        if (this.nightDome) this.nightDome.material.opacity = 1.0 - t;
        if (this.morningDome) this.morningDome.material.opacity = t;

        // 2. Background and Fog colors
        const nightSky = new THREE.Color('#050816');
        const morningSky = new THREE.Color('#508cf5');
        const currentSky = nightSky.clone().lerp(morningSky, t);
        this.scene.background = currentSky;

        const nightFog = new THREE.Color('#050816');
        const morningFog = new THREE.Color('#9fc0f8');
        const currentFogColor = nightFog.clone().lerp(morningFog, t);
        this.scene.fog.color = currentFogColor;

        const currentFogDensity = THREE.MathUtils.lerp(0.017, 0.012, t);
        this.scene.fog.density = currentFogDensity;

        // 3. Hemisphere light settings
        const nightHemiSky = new THREE.Color('#36507b');
        const morningHemiSky = new THREE.Color('#e8f0ff');
        const currentHemiSky = nightHemiSky.clone().lerp(morningHemiSky, t);

        const nightHemiGround = new THREE.Color('#05050f');
        const morningHemiGround = new THREE.Color('#2d5a27');
        const currentHemiGround = nightHemiGround.clone().lerp(morningHemiGround, t);

        this.hemiLight.color = currentHemiSky;
        this.hemiLight.groundColor = currentHemiGround;
        this.hemiLight.intensity = THREE.MathUtils.lerp(0.28, 0.75, t);

        // 4. Directional Lights intensities
        this.moonLight.intensity = THREE.MathUtils.lerp(0.95, 0.0, t);
        this.sunLight.intensity = THREE.MathUtils.lerp(0.0, 1.3, t);

        // 5. Sun and Moon scaling (appear/disappear)
        const moonScale = 1.0 - t;
        this.moon.scale.setScalar(Math.max(0.001, moonScale));
        this.moonGlow.scale.set(32 * moonScale, 32 * moonScale, 1.0);
        this.moonGlow.material.opacity = 0.9 * moonScale;

        const sunScale = t;
        this.sun.scale.setScalar(Math.max(0.001, sunScale));
        this.sunGlow.scale.set(45 * sunScale, 45 * sunScale, 1.0);
        this.sunGlow.material.opacity = 0.85 * sunScale;

        // 6. Clouds scaling and drifting
        this.clouds.scale.setScalar(THREE.MathUtils.lerp(0.001, 1.0, t));
        if (this.clouds.children.length > 0) {
            this.clouds.children.forEach((cloud) => {
                cloud.position.x += delta * 1.2; // Slowly drift
                // Wrap around sky bounds
                if (cloud.position.x > 80) {
                    cloud.position.x = -80;
                    cloud.position.z = (Math.random() - 0.5) * 120;
                }
            });
        }
    }
}