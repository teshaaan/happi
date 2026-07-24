import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MathUtils.js';

export class ForestAssets {
    constructor(scene) {
        this.scene = scene;
        this.container = new THREE.Group();
        this.scene.add(this.container);

        // Pond reservation boundary (Center at x: 40, z: -35, radius: 22)
        this.pondCenter = new THREE.Vector2(40, -35);
        this.pondRadius = 22.0;

        // Visual Pond Marker / Shoreline Ring
        this.createPondPlaceholder();

        // Load nature assets
        this.loadNatureAssets();
    }

    createPondPlaceholder() {
        // Visual indicator outlining the reserved pond site
        const ringGeo = new THREE.RingGeometry(this.pondRadius - 0.8, this.pondRadius + 0.2, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: '#387870',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.35,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.set(this.pondCenter.x, getTerrainHeight(this.pondCenter.x, this.pondCenter.y) + 0.05, this.pondCenter.y);
        this.container.add(ringMesh);
    }

    loadNatureAssets() {
        const loader = new GLTFLoader();
        loader.load('/natureassets.glb', (gltf) => {
            const root = gltf.scene;

            // Find all candidate top-level nodes in natureassets.glb
            let candidateNodes = [];
            root.traverse((child) => {
                if (child.parent === root || child.parent?.name === 'RootNode') {
                    if (child.name && child.name.toLowerCase().includes('tree')) {
                        candidateNodes.push(child);
                    }
                }
            });

            if (candidateNodes.length === 0) {
                // Fallback traverse all direct mesh containers
                root.children.forEach(child => candidateNodes.push(child));
            }

            // Pick 10 distinct asset templates spread across candidateNodes
            const templates = [];
            const step = Math.max(1, Math.floor(candidateNodes.length / 10));
            for (let i = 0; i < 10 && i * step < candidateNodes.length; i++) {
                const node = candidateNodes[i * step];
                // Clone template and normalize height scale
                const clone = node.clone(true);
                
                // Enable shadows
                clone.traverse(c => {
                    if (c.isMesh) {
                        c.castShadow = true;
                        c.receiveShadow = true;
                        if (c.material) {
                            c.material.roughness = 0.88;
                            c.material.metalness = 0.05;
                        }
                    }
                });

                // Compute bounding box height to set standard scale
                const bbox = new THREE.Box3().setFromObject(clone);
                const size = bbox.getSize(new THREE.Vector3());
                const h = size.y || 1;
                
                templates.push({
                    object: clone,
                    originalHeight: h,
                    // Assign category based on index variation (Tall tree, bush, rock, medium tree)
                    type: (i % 3 === 0) ? 'tallTree' : (i % 4 === 1) ? 'rock' : 'mediumTree'
                });
            }

            if (templates.length > 0) {
                this.populateForest(templates);
            }
        }, undefined, (err) => {
            console.warn('Error loading natureassets.glb:', err);
        });
    }

    populateForest(templates) {
        const count = 160; // Total scattered instances across expanded forest
        const minSpawnRadius = 12; // Keep immediate spawn area (0,0) clear
        const maxSpawnRadius = 175; // Outer boundary

        for (let i = 0; i < count; i++) {
            // Random position using polar distribution for natural clustering
            const angle = Math.random() * Math.PI * 2;
            const r = minSpawnRadius + Math.pow(Math.random(), 0.6) * (maxSpawnRadius - minSpawnRadius);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            // Check distance to Pond reservation area
            const distToPond = Math.hypot(x - this.pondCenter.x, z - this.pondCenter.y);

            // If inside pond basin, skip placing tall trees or large boulders
            if (distToPond < this.pondRadius - 2) {
                continue;
            }

            // Pick template (if near pond rim, favor rock / low bush templates)
            let template;
            if (distToPond >= this.pondRadius - 2 && distToPond <= this.pondRadius + 4) {
                // Shoreline rim: place rocks or low vegetation
                const rockTemplates = templates.filter(t => t.type === 'rock');
                template = rockTemplates.length > 0 ? rockTemplates[i % rockTemplates.length] : templates[i % templates.length];
            } else {
                template = templates[i % templates.length];
            }

            const instance = template.object.clone(true);

            // Height scaling factor
            let targetHeight = 6.0 + Math.random() * 8.0;
            if (template.type === 'rock') targetHeight = 1.5 + Math.random() * 2.5;
            if (distToPond <= this.pondRadius + 4) targetHeight *= 0.6; // Smaller near shore

            const scaleRatio = targetHeight / Math.max(template.originalHeight, 0.5);
            instance.scale.setScalar(scaleRatio);

            // Random rotation
            instance.rotation.y = Math.random() * Math.PI * 2;
            instance.rotation.x = (Math.random() - 0.5) * 0.08;
            instance.rotation.z = (Math.random() - 0.5) * 0.08;

            // Calculate exact ground Y position using Raycast height map
            const terrainY = getTerrainHeight(x, z);
            
            // Adjust yOffset so asset sits snugly on ground
            const bounds = new THREE.Box3().setFromObject(instance);
            const minYOffset = bounds.min.y;
            instance.position.set(x, terrainY - minYOffset, z);

            this.container.add(instance);
        }
    }
}
