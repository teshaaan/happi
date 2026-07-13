import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;

        this.skyColor = '#050816';
        this.horizonColor = '#101733';
        this.groundColor = '#05050f';
        
        this.setupAtmosphere();
        this.setupSkyDome();
        this.setupLights();
        this.setupMoon();
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
        const skyTexture = this.createCanvasTexture((context, width, height) => {
            const gradient = context.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#03050c');
            gradient.addColorStop(0.55, this.skyColor);
            gradient.addColorStop(1, this.horizonColor);

            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);

            context.globalAlpha = 0.18;
            for (let i = 0; i < 120; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height * 0.7;
                const radius = Math.random() * 1.2 + 0.3;
                context.fillStyle = '#ffffff';
                context.beginPath();
                context.arc(x, y, radius, 0, Math.PI * 2);
                context.fill();
            }
            context.globalAlpha = 1;
        });

        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(280, 48, 32),
            new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide })
        );

        this.scene.add(dome);
    }

    setupLights() {
        this.hemiLight = new THREE.HemisphereLight('#36507b', this.groundColor, 0.28);
        this.scene.add(this.hemiLight);

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

            gradient.addColorStop(0, '#f7f5ea');
            gradient.addColorStop(0.55, '#d9d4c6');
            gradient.addColorStop(1, '#7f867d');
            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);

            const craterColors = ['#b9b4a6', '#8f8d82', '#cbc5b4', '#a8a394'];
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
            lighting.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            lighting.addColorStop(0.4, 'rgba(255, 255, 255, 0.25)');
            lighting.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
            context.fillStyle = lighting;
            context.fillRect(0, 0, width, height);
        });

        this.moon = new THREE.Mesh(
            new THREE.SphereGeometry(4.2, 48, 48),
            new THREE.MeshBasicMaterial({
                map: moonTexture,
                fog: false,
            })
        );

        this.moon.position.copy(this.moonLight.position);

        const glowTexture = this.createCanvasTexture((context, width, height) => {
            const radius = width / 2;
            const glow = context.createRadialGradient(radius, radius, radius * 0.06, radius, radius, radius);
            glow.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
            glow.addColorStop(0.25, 'rgba(184, 205, 255, 0.28)');
            glow.addColorStop(0.7, 'rgba(126, 152, 227, 0.08)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            context.fillStyle = glow;
            context.fillRect(0, 0, width, height);
        });

        this.moonGlow = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: glowTexture,
                color: '#dce7ff',
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false,
            })
        );
        this.moonGlow.position.copy(this.moon.position);
        this.moonGlow.scale.set(18, 18, 1);

        this.scene.add(this.moon);
        this.scene.add(this.moonGlow);
    }
}