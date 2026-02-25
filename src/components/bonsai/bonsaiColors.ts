/** Theme-aware color palette for the bonsai tree */

export interface BonsaiColorPalette {
    trunk: string;
    trunkDark: string;
    branch: string;
    leafHealthy: string;
    leafWilting: string;
    blossom: string;
    blossomCenter: string;
    potBody: string;
    potRim: string;
    potSoil: string;
    potSoilDry: string;
    sparkle: string;
    water: string;
    cloud: string;
    moss: string;
    stone: string;
}

const lightPalette: BonsaiColorPalette = {
    trunk: '#6B5B4A',
    trunkDark: '#4A3F35',
    branch: '#7C6A5A',
    leafHealthy: '#6B8F4A',
    leafWilting: '#A0845C',
    blossom: '#E8A0B4',
    blossomCenter: '#F0C8A0',
    potBody: '#C4956A',
    potRim: '#A07850',
    potSoil: '#5E4B3C',
    potSoilDry: '#8C7E72',
    sparkle: '#E07B39',
    water: '#7CB8D4',
    cloud: '#D4E6F1',
    moss: '#4A7A3A',
    stone: '#9E9688',
};

const darkPalette: BonsaiColorPalette = {
    trunk: '#8B7B6A',
    trunkDark: '#6A5F52',
    branch: '#9C8A7A',
    leafHealthy: '#8BAF6A',
    leafWilting: '#C0A47C',
    blossom: '#F0B8C8',
    blossomCenter: '#F8D8B8',
    potBody: '#D4A57A',
    potRim: '#B08860',
    potSoil: '#7E6B5C',
    potSoilDry: '#A09488',
    sparkle: '#FFB784',
    water: '#9CD0E8',
    cloud: '#3D5A80',
    moss: '#6A9A5A',
    stone: '#B0A89A',
};

export const getBonsaiColors = (isDark: boolean): BonsaiColorPalette =>
    isDark ? darkPalette : lightPalette;

/** Interpolate between healthy and wilting leaf color based on health (0-100) */
export const getLeafColor = (isDark: boolean, health: number): string => {
    const palette = getBonsaiColors(isDark);
    if (health >= 70) return palette.leafHealthy;
    if (health <= 30) return palette.leafWilting;

    // Simple linear interpolation for the mid range
    const t = (health - 30) / 40; // 0 at health=30, 1 at health=70
    return interpolateHex(palette.leafWilting, palette.leafHealthy, t);
};

/** Interpolate between two hex colors */
const interpolateHex = (colorA: string, colorB: string, t: number): string => {
    const a = hexToRgb(colorA);
    const b = hexToRgb(colorB);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r},${g},${bl})`;
};

const hexToRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
});
