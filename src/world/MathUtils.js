// Generates static, rolling hills
export const getTerrainHeight = (x, z) => {
    return Math.sin(x * 0.1) * 2.0 + Math.cos(z * 0.15) * 1.5;
};