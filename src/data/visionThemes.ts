export interface VisionThemeKeyword {
    label: string;
    query: string;
}

export interface VisionTheme {
    id: string;
    title: string;
    description: string;
    /** Subcategory-style keyword sets shown in the image browser */
    keywords: VisionThemeKeyword[];
}

export const VISION_THEMES: VisionTheme[] = [
    {
        id: 'architecture_of_joy',
        title: 'The Architecture of Joy',
        description: 'Focus on the small, intentional moments that bring light to your day. Create a collage capturing the atmosphere of peace and tiny moments of joy.',
        keywords: [
            { label: 'Cozy Moments', query: 'cozy morning light peaceful home candle warm aesthetic' },
            { label: 'Simple Joys', query: 'simple joys daily life book coffee minimal calm' },
            { label: 'Soft Light', query: 'soft window light interior warm hygge aesthetic minimal' },
        ],
    },
    {
        id: 'fearless_momentum',
        title: 'Fearless Momentum',
        description: 'Channel unstoppable energy and bold action. Create a collage that embodies confidence, momentum, and a fearless attitude.',
        keywords: [
            { label: 'Confidence', query: 'powerful woman confidence bold cinematic editorial' },
            { label: 'In Motion', query: 'athlete running dynamic motion fearless sport cinematic' },
            { label: 'Bold Energy', query: 'bold fashion editorial street style confidence energy' },
        ],
    },
    {
        id: 'quiet_grounding',
        title: 'Quiet Grounding',
        description: 'Find stability and presence in the current moment. Build a collage using natural textures and landscapes that feel stabilizing to you.',
        keywords: [
            { label: 'Forest & Mist', query: 'misty forest grounding earthy calm nature morning' },
            { label: 'Earth & Stone', query: 'stone rocks natural texture earth minimal serene' },
            { label: 'Stillness', query: 'mountain valley fog tranquil landscape stillness' },
        ],
    },
    {
        id: 'abundant_gratitude',
        title: 'Abundant Gratitude',
        description: 'Shift your focus to the wealth of good already present. Pin images that represent simple luxuries and recent wins, no matter how small.',
        keywords: [
            { label: 'Golden Bloom', query: 'golden harvest abundance warm flowers blooming grateful' },
            { label: 'Warm Tables', query: 'beautiful table setting fresh flowers morning sun warmth' },
            { label: 'Lush Living', query: 'lush garden overflowing fruit abundance golden light' },
        ],
    },
    {
        id: 'creative_flow',
        title: 'Creative Flow',
        description: 'Unlock your imagination and playful spirit. Build a vibrant collage filled with abstract colors and unconventional ideas.',
        keywords: [
            { label: 'Art Studio', query: 'colorful abstract art studio creative expressive painting' },
            { label: 'Color Splash', query: 'artist palette vibrant color splash creative process' },
            { label: 'Abstract', query: 'bold abstract art gallery colorful contemporary editorial' },
        ],
    },
    {
        id: 'intentional_growth',
        title: 'Intentional Growth',
        description: 'Embrace the uncomfortable but rewarding process of becoming. Find images of nature breaking through obstacles or thriving in unexpected places.',
        keywords: [
            { label: 'Breaking Through', query: 'seedling sprouting growth green plant through concrete' },
            { label: 'Forest Floor', query: 'fern moss green nature growth forest floor morning light' },
            { label: 'Resilience', query: 'small plant growing resilience nature morning green' },
        ],
    },
    {
        id: 'compassionate_grace',
        title: 'Compassionate Grace',
        description: 'Treat yourself with the same kindness you offer others. Create a soft, gentle collage that visually represents comfort and nourishment.',
        keywords: [
            { label: 'Self Care', query: 'soft self care cozy bath candle pastel gentle aesthetic' },
            { label: 'Comfort', query: 'tender moment comfort blanket warm tea kindness cozy' },
            { label: 'Delicate', query: 'delicate flowers soft light pastel blush grace feminine' },
        ],
    },
];

// Helper to get a theme for a specific date (deterministic so it stays the same all day)
export const getThemeForDate = (dateStr: string): VisionTheme => {
    // Simple hash to pick a theme
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = (hash << 5) - hash + dateStr.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % VISION_THEMES.length;
    return VISION_THEMES[index];
};
