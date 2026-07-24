import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;

        // Colors for states
        this.skyColor = '#060a1c';
        this.horizonColor = '#121b3d';
        this.groundColor = '#0c140d';

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
        // Soft atmospheric fog for deep forest distance
        this.scene.fog = new THREE.FogExp2(this.skyColor, 0.0045);
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
        // 1. Night sky dome (rich starry night canvas)
        const nightTexture = this.createCanvasTexture((context, width, height) => {
            const gradient = context.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#02040a');
            gradient.addColorStop(0.5, '#060a1e');
            gradient.addColorStop(1, '#141e42');

            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);

            // Rich twinkling stars
            context.globalAlpha = 0.45;
            for (let i = 0; i < 400; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height * 0.75;
                const radius = Math.random() * 1.6 + 0.4;
                context.fillStyle = (i % 7 === 0) ? '#aaccff' : ((i % 5 === 0) ? '#ffeeaa' : '#ffffff');
                context.beginPath();
                context.arc(x, y, radius, 0, Math.PI * 2);
                context.fill();
            }
            context.globalAlpha = 1.0;
        });

        this.nightDome = new THREE.Mesh(
            new THREE.SphereGeometry(550, 48, 32),
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
            gradient.addColorStop(0, '#3672d6');
            gradient.addColorStop(0.55, '#6da1f8');
            gradient.addColorStop(1, '#ffd699');

            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);
        });

        this.morningDome = new THREE.Mesh(
            new THREE.SphereGeometry(548, 48, 32),
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
        // Hemisphere light: soft nocturnal ambient fill
        this.hemiLight = new THREE.HemisphereLight('#4a68a0', '#152218', 0.58);
        this.scene.add(this.hemiLight);

        // Main Moonlight: Bright, luminous silver-blue directional light
        this.moonLight = new THREE.DirectionalLight('#e0ebff', 2.2);
        this.moonLight.position.set(160, 200, -180);
        this.moonLight.castShadow = true;
        this.moonLight.shadow.mapSize.width = 2048;
        this.moonLight.shadow.mapSize.height = 2048;
        const shadowSize = 240;
        this.moonLight.shadow.camera.left = -shadowSize;
        this.moonLight.shadow.camera.right = shadowSize;
        this.moonLight.shadow.camera.top = shadowSize;
        this.moonLight.shadow.camera.bottom = -shadowSize;
        this.moonLight.shadow.camera.near = 0.5;
        this.moonLight.shadow.camera.far = 650;

        this.scene.add(this.moonLight);

        // Soft secondary moonlight fill light to prevent harsh black shadows
        this.moonFillLight = new THREE.DirectionalLight('#7fa4db', 0.85);
        this.moonFillLight.position.set(-120, 140, 120);
        this.scene.add(this.moonFillLight);
    }

    setupMoon() {
        // High-resolution canvas texture for a big, detailed, luminous moon
        const moonTexture = this.createCanvasTexture((context, width, height) => {
            const radius = width / 2;
            const gradient = context.createRadialGradient(
                radius * 0.42,
                radius * 0.38,
                radius * 0.15,
                radius,
                radius,
                radius
            );

            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, '#fffbf0');
            gradient.addColorStop(0.65, '#e3e8f5');
            gradient.addColorStop(1, '#b5c0d6');
            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);

            // Craters and surface detail
            const craterColors = ['#ccd4e2', '#aab4c7', '#eaf0fa', '#95a1b8'];
            for (let i = 0; i < 85; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const craterRadius = Math.random() * 22 + 4;
                const crater = context.createRadialGradient(x - craterRadius * 0.25, y - craterRadius * 0.25, craterRadius * 0.15, x, y, craterRadius);
                crater.addColorStop(0, craterColors[i % craterColors.length]);
                crater.addColorStop(1, 'rgba(100, 110, 130, 0.04)');
                context.fillStyle = crater;
                context.beginPath();
                context.arc(x, y, craterRadius, 0, Math.PI * 2);
                context.fill();
            }

            // Radial surface shading for 3D sphere depth
            const lighting = context.createRadialGradient(radius * 0.36, radius * 0.30, radius * 0.05, radius, radius, radius);
            lighting.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
            lighting.addColorStop(0.45, 'rgba(255, 255, 255, 0.40)');
            lighting.addColorStop(1, 'rgba(15, 25, 45, 0.22)');
            context.fillStyle = lighting;
            context.fillRect(0, 0, width, height);
        });

        // Big, bright Moon mesh (Radius 28.0)
        this.moon = new THREE.Mesh(
            new THREE.SphereGeometry(28.0, 64, 64),
            new THREE.MeshBasicMaterial({
                map: moonTexture,
                fog: false,
            })
        );
        this.moon.position.copy(this.moonLight.position);

        // 1. Inner intense luminous moon core glow
        const innerGlowTexture = this.createCanvasTexture((context, width, height) => {
            const radius = width / 2;
            const glow = context.createRadialGradient(radius, radius, radius * 0.08, radius, radius, radius);
            glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            glow.addColorStop(0.25, 'rgba(220, 235, 255, 0.65)');
            glow.addColorStop(0.6, 'rgba(160, 195, 255, 0.25)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            context.fillStyle = glow;
            context.fillRect(0, 0, width, height);
        });

        this.moonGlowInner = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: innerGlowTexture,
                color: '#ffffff',
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false,
            })
        );
        this.moonGlowInner.position.copy(this.moon.position);
        this.moonGlowInner.scale.set(160, 160, 1);

        // 2. Outer soft celestial blue aura glow
        const outerGlowTexture = this.createCanvasTexture((context, width, height) => {
            const radius = width / 2;
            const glow = context.createRadialGradient(radius, radius, radius * 0.05, radius, radius, radius);
            glow.addColorStop(0, 'rgba(180, 215, 255, 0.60)');
            glow.addColorStop(0.35, 'rgba(120, 175, 255, 0.30)');
            glow.addColorStop(0.75, 'rgba(60, 110, 220, 0.10)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            context.fillStyle = glow;
            context.fillRect(0, 0, width, height);
        });

        this.moonGlowOuter = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: outerGlowTexture,
                color: '#b0d4ff',
                transparent: true,
                opacity: 0.75,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false,
            })
        );
        this.moonGlowOuter.position.copy(this.moon.position);
        this.moonGlowOuter.scale.set(340, 340, 1);

        this.scene.add(this.moon);
        this.scene.add(this.moonGlowInner);
        this.scene.add(this.moonGlowOuter);
    }

    setupSun() {
        // Sunlight Directional Light
        this.sunLight = new THREE.DirectionalLight('#fffaed', 0.0);
        this.sunLight.position.set(-160, 200, 180);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        const shadowSize = 240;
        this.sunLight.shadow.camera.left = -shadowSize;
        this.sunLight.shadow.camera.right = shadowSize;
        this.sunLight.shadow.camera.top = shadowSize;
        this.sunLight.shadow.camera.bottom = -shadowSize;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 650;

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
            new THREE.SphereGeometry(22.0, 48, 48),
            new THREE.MeshBasicMaterial({
                map: sunTexture,
                fog: false,
            })
        );
        this.sun.position.copy(this.sunLight.position);
        this.sun.scale.setScalar(0.001);

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
        this.sunGlow.scale.set(160, 160, 1);
        this.sunGlow.scale.setScalar(0.001);

        this.scene.add(this.sun);
        this.scene.add(this.sunGlow);
    }

    setupClouds() {
        this.clouds = new THREE.Group();
        this.scene.add(this.clouds);

        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.65,
            metalness: 0.0,
            emissive: '#e8f0ff',
            emissiveIntensity: 0.42,
            flatShading: true,
        });

        const cloudPositions = [
            { x: -160, y: 145, z: -110, scale: 3.8 },
            { x: -60, y: 165, z: -180, scale: 4.8 },
            { x: 90, y: 140, z: -120, scale: 3.5 },
            { x: 180, y: 175, z: -65, scale: 4.2 },
            { x: -210, y: 155, z: 80, scale: 4.0 },
            { x: 40, y: 180, z: 170, scale: 5.2 },
            { x: 150, y: 150, z: 110, scale: 3.6 },
            { x: -90, y: 170, z: 150, scale: 4.5 },
        ];

        cloudPositions.forEach((pos) => {
            const cloud = new THREE.Group();
            const numPuffs = 6 + Math.floor(Math.random() * 4);
            for (let i = 0; i < numPuffs; i++) {
                const radius = 3.5 + Math.random() * 4.5;
                const geom = new THREE.SphereGeometry(radius, 10, 10);
                const mesh = new THREE.Mesh(geom, cloudMaterial);
                mesh.position.set(
                    (Math.random() - 0.5) * 12.0,
                    (Math.random() - 0.5) * 3.5,
                    (Math.random() - 0.5) * 9.0
                );
                mesh.scale.set(1.6, 0.78, 1.25);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                cloud.add(mesh);
            }
            cloud.position.set(pos.x, pos.y, pos.z);
            cloud.scale.setScalar(pos.scale);
            cloud.userData = { baseScale: pos.scale };
            this.clouds.add(cloud);
        });

        this.clouds.scale.setScalar(0.001);
    }

    update(delta) {
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
        const nightSky = new THREE.Color('#060a1c');
        const morningSky = new THREE.Color('#508cf5');
        const currentSky = nightSky.clone().lerp(morningSky, t);
        this.scene.background = currentSky;

        const nightFog = new THREE.Color('#060a1c');
        const morningFog = new THREE.Color('#9fc0f8');
        const currentFogColor = nightFog.clone().lerp(morningFog, t);
        this.scene.fog.color = currentFogColor;

        const currentFogDensity = THREE.MathUtils.lerp(0.0045, 0.0035, t);
        this.scene.fog.density = currentFogDensity;

        // 3. Hemisphere light settings
        const nightHemiSky = new THREE.Color('#4a68a0');
        const morningHemiSky = new THREE.Color('#e8f0ff');
        const currentHemiSky = nightHemiSky.clone().lerp(morningHemiSky, t);

        const nightHemiGround = new THREE.Color('#152218');
        const morningHemiGround = new THREE.Color('#2d5a27');
        const currentHemiGround = nightHemiGround.clone().lerp(morningHemiGround, t);

        this.hemiLight.color = currentHemiSky;
        this.hemiLight.groundColor = currentHemiGround;
        this.hemiLight.intensity = THREE.MathUtils.lerp(0.58, 0.85, t);

        // 4. Directional Lights intensities
        this.moonLight.intensity = THREE.MathUtils.lerp(2.2, 0.0, t);
        if (this.moonFillLight) this.moonFillLight.intensity = THREE.MathUtils.lerp(0.85, 0.0, t);
        this.sunLight.intensity = THREE.MathUtils.lerp(0.0, 1.55, t);

        // 5. Sun and Moon scaling (appear/disappear)
        const moonScale = 1.0 - t;
        this.moon.scale.setScalar(Math.max(0.001, moonScale));
        this.moonGlowInner.scale.set(160 * moonScale, 160 * moonScale, 1.0);
        this.moonGlowInner.material.opacity = 1.0 * moonScale;
        this.moonGlowOuter.scale.set(340 * moonScale, 340 * moonScale, 1.0);
        this.moonGlowOuter.material.opacity = 0.75 * moonScale;

        const sunScale = t;
        this.sun.scale.setScalar(Math.max(0.001, sunScale));
        this.sunGlow.scale.set(160 * sunScale, 160 * sunScale, 1.0);
        this.sunGlow.material.opacity = 0.85 * sunScale;

        // 6. Clouds scaling and drifting
        this.clouds.scale.setScalar(THREE.MathUtils.lerp(0.001, 1.0, t));
        if (this.clouds.children.length > 0) {
            this.clouds.children.forEach((cloud) => {
                cloud.position.x += delta * 2.5;
                if (cloud.position.x > 250) {
                    cloud.position.x = -250;
                    cloud.position.z = (Math.random() - 0.5) * 360;
                }
            });
        }
    }
}