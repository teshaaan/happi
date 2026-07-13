// Generates static, rolling hills
export const getTerrainHeight = (x, z) => {
    return Math.sin(x * 0.12) * 1.5 + Math.cos(z * 0.16) * 1.0;
};