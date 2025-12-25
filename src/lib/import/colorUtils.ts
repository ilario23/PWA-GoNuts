/**
 * Semantic Color Generation for Category Import
 * 
 * Generates vibrant, distinguishable colors based on category type:
 * - Expense: Warm tones (reds, oranges, yellows, pinks, warm purples)
 * - Income: Cool greens and teals
 * - Investment: Blues and indigos
 */

type CategoryType = "expense" | "income" | "investment";

/**
 * Hue ranges for each category type.
 * Expense has multiple ranges to support more categories.
 */
const HUE_RANGES: Record<CategoryType, { ranges: [number, number][], saturation: number, lightness: number }> = {
    expense: {
        // Warm colors: Reds (0-30), Oranges (30-50), Yellows (50-70), Pinks (320-360), Warm Purples (280-320)
        ranges: [
            [0, 30],      // Reds, corals
            [30, 50],     // Oranges
            [50, 70],     // Yellows, ambers
            [320, 360],   // Pinks, magentas
            [280, 320],   // Warm purples
        ],
        saturation: 70,
        lightness: 50
    },
    income: {
        // Cool greens and teals
        ranges: [[120, 180]],
        saturation: 65,
        lightness: 45
    },
    investment: {
        // Blues and indigos
        ranges: [[200, 260]],
        saturation: 70,
        lightness: 50
    }
};

/**
 * Golden angle for optimal color distribution (in degrees)
 */
const GOLDEN_ANGLE = 137.508;

/**
 * Convert HSL to HEX color
 */
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }

    const toHex = (val: number) => {
        const hex = Math.round((val + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a semantic color based on category type and index.
 * Uses golden angle distribution for optimal visual separation.
 * 
 * @param type - The category type (expense, income, investment)
 * @param index - The index of this category within its type (0-based)
 * @returns A hex color string like "#FF5733"
 */
export function generateSemanticColor(type: CategoryType, index: number): string {
    const config = HUE_RANGES[type];
    const { ranges, saturation, lightness } = config;

    // Calculate total hue span across all ranges
    const totalSpan = ranges.reduce((sum, [start, end]) => sum + (end - start), 0);

    // Use golden angle to distribute colors
    // Multiply by index to spread colors across the spectrum
    const rawOffset = (index * GOLDEN_ANGLE) % totalSpan;

    // Find which range this offset falls into and calculate final hue
    let accumulatedSpan = 0;
    let hue = 0;

    for (const [start, end] of ranges) {
        const rangeSpan = end - start;
        if (rawOffset < accumulatedSpan + rangeSpan) {
            // This offset falls within this range
            hue = start + (rawOffset - accumulatedSpan);
            break;
        }
        accumulatedSpan += rangeSpan;
    }

    // Add slight lightness variation for more visual interest
    const lightnessVariation = (index % 3 - 1) * 5; // -5, 0, or +5
    const finalLightness = Math.max(35, Math.min(65, lightness + lightnessVariation));

    return hslToHex(hue, saturation, finalLightness);
}

/**
 * Pre-defined curated palette as fallback for edge cases.
 * These are hand-picked modern colors that look great together.
 */
export const CURATED_COLORS: Record<CategoryType, string[]> = {
    expense: [
        '#EF4444', '#F97316', '#F59E0B', '#FBBF24', '#D97706',
        '#EC4899', '#DB2777', '#F472B6', '#A855F7', '#9333EA',
        '#C084FC', '#FB7185', '#FDA4AF', '#E11D48', '#BE185D',
        '#F87171', '#FB923C', '#FCD34D', '#E879F9', '#D946EF'
    ],
    income: [
        '#10B981', '#14B8A6', '#22C55E', '#059669', '#0D9488',
        '#34D399', '#2DD4BF', '#4ADE80', '#16A34A', '#047857'
    ],
    investment: [
        '#3B82F6', '#6366F1', '#0EA5E9', '#2563EB', '#4F46E5',
        '#06B6D4', '#0284C7', '#818CF8', '#38BDF8', '#1D4ED8'
    ]
};

/**
 * Get a curated color by type and index.
 * Falls back to generated color if index exceeds curated list.
 */
export function getCuratedColor(type: CategoryType, index: number): string {
    const palette = CURATED_COLORS[type];
    if (index < palette.length) {
        return palette[index];
    }
    // Fall back to generated color for larger indices
    return generateSemanticColor(type, index);
}
