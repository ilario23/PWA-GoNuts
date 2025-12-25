import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// COLOR UTILITIES
// ============================================

/**
 * Convert hex color to HSL values.
 * @param hex - Hex color string (with or without #)
 * @returns HSL object or null if invalid
 */
export function hexToHsl(
  hex: string
): { h: number; s: number; l: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, "");
  if (hex.length !== 6) return null;

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Create a shade variation of a base color for chart series.
 * Creates variations from dark (30% lightness) to light (70% lightness).
 *
 * @param baseColor - Base hex color
 * @param index - Current index in the series (0-based)
 * @param total - Total number of items in the series
 * @returns HSL color string
 */
export function createColorShade(
  baseColor: string,
  index: number,
  total: number
): string {
  const hsl = hexToHsl(baseColor);
  if (!hsl) {
    // Fallback if color parsing fails
    return `hsl(${(index * 60) % 360}, 70%, ${45 + ((index * 10) % 30)}%)`;
  }

  // Create variations: first item is darkest, last is lightest
  // Range from 30% to 70% lightness for good visibility
  const minLightness = 30;
  const maxLightness = 70;
  const lightnessRange = maxLightness - minLightness;
  const lightnessStep = total > 1 ? lightnessRange / (total - 1) : 0;
  const newLightness = minLightness + index * lightnessStep;

  // Also slightly vary saturation for more distinction
  const saturationVariation = Math.max(
    50,
    Math.min(90, hsl.s + (index % 2 === 0 ? 5 : -5))
  );

  return `hsl(${hsl.h.toFixed(0)}, ${saturationVariation.toFixed(
    0
  )}%, ${newLightness.toFixed(0)}%)`;
}

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Returns the current date in YYYY-MM-DD format relying on local time.
 * This avoids the issue where converting to UTC string pushes the date
 * to the previous day for users in timezones ahead of UTC.
 */
export function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
