import { Cache } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

export const MODEL_PATHS = [
    '/landscape.glb',
    '/natureassets.glb',
    '/duck.glb',
    '/fox.glb',
    '/shinto_style_statueshrine.glb',
    '/stylized_rock_01.glb',
    '/stylized_tree_stump.glb',
    '/low-_poly_cherry_blossom_tree_3d_models.glb',
    '/low_poly_fly_agaric.glb',
    '/low_poly_rock_cave.glb',
];

Cache.enabled = true;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
dracoLoader.setDecoderConfig({ type: 'wasm' });

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const gltfCache = new Map();

function getGLTF(path) {
    if (!gltfCache.has(path)) {
        gltfCache.set(path, gltfLoader.loadAsync(path));
    }
    return gltfCache.get(path);
}

function cloneGLTF(gltf) {
    return {
        ...gltf,
        scene: cloneSkeleton(gltf.scene),
        animations: gltf.animations,
    };
}

export function loadGLTF(path, onLoad, onProgress, onError) {
    getGLTF(path)
        .then((gltf) => onLoad(cloneGLTF(gltf)))
        .catch((error) => {
            if (onError) {
                onError(error);
            } else {
                console.warn(`Error loading ${path}:`, error);
            }
        });
}

export function preloadGLTF(paths = MODEL_PATHS) {
    return Promise.allSettled(paths.map((path) => getGLTF(path)));
}
