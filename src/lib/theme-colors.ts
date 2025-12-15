// Theme color presets following shadcn theming best practices
// Each theme defines CSS variables for light and dark modes

export interface ThemeColors {
  name: string;
  label: string;
  light: {
    primary: string;
    primaryForeground: string;
    ring: string;
    // Level 2: Accent colors
    accent: string;
    accentForeground: string;
    // Level 3: Extended palette
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    // Chart colors (derived from primary hue)
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
  };
  dark: {
    primary: string;
    primaryForeground: string;
    ring: string;
    accent: string;
    accentForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
  };
}

// ============================================
// CHART COLOR PALETTES
// ============================================

/**
 * Predefined chart color palettes for consistent styling.
 * Use these instead of hardcoded colors in chart components.
 */
export const CHART_PALETTES = {
  /** Default categorical palette for pie/bar charts (uses CSS variables) */
  categorical: [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ],

  /** Semantic colors for income/expense/investment charts */
  semantic: {
    income: "hsl(142.1 70.6% 45.3%)", // Green
    expense: "hsl(0 84.2% 60.2%)", // Red
    investment: "hsl(217.2 91.2% 59.8%)", // Blue
    balance: "hsl(47.9 95.8% 53.1%)", // Yellow/Gold
  },

  /** Gradient-friendly colors for area charts */
  gradients: {
    income: {
      stroke: "hsl(142.1 70.6% 45.3%)",
      fillStart: "hsl(142.1 70.6% 45.3% / 0.8)",
      fillEnd: "hsl(142.1 70.6% 45.3% / 0.1)",
    },
    expense: {
      stroke: "hsl(0 84.2% 60.2%)",
      fillStart: "hsl(0 84.2% 60.2% / 0.8)",
      fillEnd: "hsl(0 84.2% 60.2% / 0.1)",
    },
    comparison: {
      stroke: "hsl(0 84.2% 60.2% / 0.5)",
      fillStart: "hsl(0 84.2% 60.2% / 0.3)",
      fillEnd: "hsl(0 84.2% 60.2% / 0.1)",
    },
  },

  /** Status colors for burn rate and alerts */
  status: {
    onTrack: "hsl(142.1 70.6% 45.3%)", // Green
    warning: "hsl(47.9 95.8% 53.1%)", // Yellow
    danger: "hsl(0 84.2% 60.2%)", // Red
    neutral: "hsl(var(--muted-foreground))",
  },
} as const;

/**
 * Get a categorical color by index with automatic wrapping.
 */
export function getCategoricalColor(index: number): string {
  return CHART_PALETTES.categorical[index % CHART_PALETTES.categorical.length];
}

/**
 * Generate a sequential palette from a base color.
 * Creates variations from dark to light.
 *
 * @param baseHue - The base hue (0-360)
 * @param count - Number of colors to generate
 * @param saturation - Base saturation (default: 70)
 */
export function generateSequentialPalette(
  baseHue: number,
  count: number,
  saturation = 70
): string[] {
  const colors: string[] = [];
  const minLightness = 30;
  const maxLightness = 70;
  const step = (maxLightness - minLightness) / Math.max(count - 1, 1);

  for (let i = 0; i < count; i++) {
    const lightness = minLightness + step * i;
    colors.push(`hsl(${baseHue}, ${saturation}%, ${lightness}%)`);
  }

  return colors;
}

// ============================================
// THEME COLOR PRESETS (Level 3 - Full Theme)
// ============================================

export const THEME_COLORS: Record<string, ThemeColors> = {
  // ========================================
  // ORDERED BY HUE (Color Wheel: 0° → 360°)
  // ========================================


  // 320° - Pink
  pink: {
    name: "pink",
    label: "Pink",
    light: {
      primary: "322 80% 50%",
      primaryForeground: "0 0% 100%",
      ring: "322 80% 50%",
      accent: "322 90% 95%",
      accentForeground: "322 80% 40%",
      secondary: "322 30% 92%",
      secondaryForeground: "322 80% 40%",
      muted: "322 30% 92%",
      mutedForeground: "322 10% 45%",
      chart1: "322 80% 50%",
      chart2: "302 80% 50%",
      chart3: "342 80% 50%",
      chart4: "322 70% 55%",
      chart5: "322 90% 45%",
    },
    dark: {
      primary: "322 80% 58%",
      primaryForeground: "0 0% 100%",
      ring: "322 80% 58%",
      accent: "322 30% 20%",
      accentForeground: "322 80% 80%",
      secondary: "322 30% 18%",
      secondaryForeground: "322 80% 80%",
      muted: "322 30% 15%",
      mutedForeground: "322 10% 65%",
      chart1: "322 80% 58%",
      chart2: "302 80% 60%",
      chart3: "342 80% 60%",
      chart4: "322 70% 65%",
      chart5: "322 90% 50%",
    },
  },

  // 347° - Rose/Pink
  rose: {
    name: "rose",
    label: "Rose",
    light: {
      primary: "346.8 77.2% 49.8%",
      primaryForeground: "355.7 100% 97.3%",
      ring: "346.8 77.2% 49.8%",
      accent: "346 95% 94%",
      accentForeground: "346.8 77.2% 39.8%",
      secondary: "346 32% 91%",
      secondaryForeground: "346.8 77.2% 39.8%",
      muted: "346 32% 91%",
      mutedForeground: "346 16.3% 46.9%",
      chart1: "347 77% 50%",
      chart2: "317 77% 55%",
      chart3: "7 77% 55%",
      chart4: "337 77% 52%",
      chart5: "287 67% 50%",
    },
    dark: {
      primary: "346.8 77.2% 49.8%",
      primaryForeground: "355.7 100% 97.3%",
      ring: "346.8 77.2% 49.8%",
      accent: "346.8 32.6% 20%",
      accentForeground: "346.8 77.2% 70%",
      secondary: "346.8 32.6% 17.5%",
      secondaryForeground: "346 40% 98%",
      muted: "346.8 32.6% 12%",
      mutedForeground: "346 20.2% 65.1%",
      chart1: "347 77% 55%",
      chart2: "317 77% 60%",
      chart3: "7 77% 58%",
      chart4: "337 77% 55%",
      chart5: "287 67% 55%",
    },
  },

  // 0° - Red
  red: {
    name: "red",
    label: "Red",
    light: {
      primary: "0 72.2% 50.6%",
      primaryForeground: "0 85.7% 97.3%",
      ring: "0 72.2% 50.6%",
      accent: "0 100% 96%",
      accentForeground: "0 72.2% 40.6%",
      secondary: "0 20% 93%",
      secondaryForeground: "0 72.2% 40.6%",
      muted: "0 20% 93%",
      mutedForeground: "0 5% 45%",
      chart1: "0 72% 51%",
      chart2: "330 72% 51%",
      chart3: "30 72% 51%",
      chart4: "0 60% 45%",
      chart5: "0 80% 60%",
    },
    dark: {
      primary: "0 72.2% 50.6%",
      primaryForeground: "0 85.7% 97.3%",
      ring: "0 72.2% 50.6%",
      accent: "0 30% 20%",
      accentForeground: "0 85% 95%",
      secondary: "0 30% 18%",
      secondaryForeground: "0 85% 95%",
      muted: "0 30% 15%",
      mutedForeground: "0 5% 65%",
      chart1: "0 72% 51%",
      chart2: "330 72% 51%",
      chart3: "30 72% 51%",
      chart4: "0 60% 45%",
      chart5: "0 80% 60%",
    },
  },

  // 25° - Orange
  orange: {
    name: "orange",
    label: "Orange",
    light: {
      primary: "24.6 95% 53.1%",
      primaryForeground: "60 9.1% 97.8%",
      ring: "24.6 95% 53.1%",
      accent: "24 95% 92%",
      accentForeground: "24.6 95% 43.1%",
      secondary: "24 32% 90%",
      secondaryForeground: "24.6 95% 33.1%",
      muted: "24 32% 90%",
      mutedForeground: "24 16.3% 40%",
      chart1: "25 95% 53%",
      chart2: "45 93% 47%",
      chart3: "5 90% 55%",
      chart4: "35 95% 50%",
      chart5: "15 93% 48%",
    },
    dark: {
      primary: "20.5 90.2% 48.2%",
      primaryForeground: "60 9.1% 97.8%",
      ring: "20.5 90.2% 48.2%",
      accent: "20.5 32.6% 20%",
      accentForeground: "20.5 90.2% 65%",
      secondary: "20.5 32.6% 17.5%",
      secondaryForeground: "20 40% 98%",
      muted: "20.5 32.6% 12%",
      mutedForeground: "20 20.2% 60%",
      chart1: "21 90% 48%",
      chart2: "41 88% 50%",
      chart3: "1 85% 55%",
      chart4: "31 90% 52%",
      chart5: "11 88% 50%",
    },
  },

  // 38° - Amber
  amber: {
    name: "amber",
    label: "Amber",
    light: {
      primary: "38 92% 50%",
      primaryForeground: "0 0% 0%",
      ring: "38 92% 50%",
      accent: "38 95% 92%",
      accentForeground: "38 92% 35%",
      secondary: "38 32% 90%",
      secondaryForeground: "38 92% 30%",
      muted: "38 32% 90%",
      mutedForeground: "38 16% 40%",
      chart1: "38 92% 50%",
      chart2: "28 92% 48%",
      chart3: "48 92% 48%",
      chart4: "18 82% 52%",
      chart5: "58 82% 45%",
    },
    dark: {
      primary: "38 92% 50%",
      primaryForeground: "38 92% 10%",
      ring: "38 92% 50%",
      accent: "38 32% 20%",
      accentForeground: "38 92% 65%",
      secondary: "38 32% 17%",
      secondaryForeground: "38 40% 98%",
      muted: "38 32% 12%",
      mutedForeground: "38 20% 60%",
      chart1: "38 92% 55%",
      chart2: "28 82% 52%",
      chart3: "48 82% 52%",
      chart4: "18 72% 55%",
      chart5: "58 72% 50%",
    },
  },

  // 47° - Yellow
  yellow: {
    name: "yellow",
    label: "Yellow",
    light: {
      primary: "47.9 95.8% 53.1%",
      primaryForeground: "26 83.3% 14.1%",
      ring: "47.9 95.8% 53.1%",
      accent: "48 100% 90%",
      accentForeground: "47.9 95.8% 40%",
      secondary: "48 30% 90%",
      secondaryForeground: "47.9 95.8% 30%",
      muted: "48 30% 90%",
      mutedForeground: "48 10% 40%",
      chart1: "48 96% 53%",
      chart2: "28 96% 50%",
      chart3: "68 96% 50%",
      chart4: "48 80% 55%",
      chart5: "48 100% 60%",
    },
    dark: {
      primary: "47.9 95.8% 53.1%",
      primaryForeground: "26 83.3% 14.1%",
      ring: "47.9 95.8% 53.1%",
      accent: "48 30% 20%",
      accentForeground: "48 96% 80%",
      secondary: "48 30% 18%",
      secondaryForeground: "48 96% 80%",
      muted: "48 30% 15%",
      mutedForeground: "48 10% 65%",
      chart1: "48 96% 53%",
      chart2: "28 96% 50%",
      chart3: "68 96% 50%",
      chart4: "48 80% 55%",
      chart5: "48 100% 60%",
    },
  },

  // 84° - Lime
  lime: {
    name: "lime",
    label: "Lime",
    light: {
      primary: "84.2 81.2% 43.9%",
      primaryForeground: "144.9 80.4% 10%",
      ring: "84.2 81.2% 43.9%",
      accent: "84 90% 90%",
      accentForeground: "84.2 81.2% 35%",
      secondary: "84 30% 90%",
      secondaryForeground: "84.2 81.2% 30%",
      muted: "84 30% 90%",
      mutedForeground: "84 10% 40%",
      chart1: "84 81% 44%",
      chart2: "64 81% 45%",
      chart3: "104 81% 45%",
      chart4: "84 70% 50%",
      chart5: "84 90% 40%",
    },
    dark: {
      primary: "84.2 81.2% 43.9%",
      primaryForeground: "144.9 80.4% 10%",
      ring: "84.2 81.2% 43.9%",
      accent: "84 30% 20%",
      accentForeground: "84 90% 80%",
      secondary: "84 30% 18%",
      secondaryForeground: "84 90% 80%",
      muted: "84 30% 15%",
      mutedForeground: "84 10% 65%",
      chart1: "84 81% 44%",
      chart2: "64 81% 45%",
      chart3: "104 81% 45%",
      chart4: "84 70% 50%",
      chart5: "84 90% 40%",
    },
  },

  // 142° - Green
  green: {
    name: "green",
    label: "Green",
    light: {
      primary: "142.1 76.2% 36.3%",
      primaryForeground: "355.7 100% 97.3%",
      ring: "142.1 76.2% 36.3%",
      accent: "142 95% 92%",
      accentForeground: "142.1 76.2% 26.3%",
      secondary: "142 32% 90%",
      secondaryForeground: "142.1 76.2% 26.3%",
      muted: "142 32% 90%",
      mutedForeground: "142 16.3% 40%",
      chart1: "142 76% 36%",
      chart2: "172 66% 40%",
      chart3: "112 66% 45%",
      chart4: "82 66% 45%",
      chart5: "202 66% 40%",
    },
    dark: {
      primary: "142.1 70.6% 45.3%",
      primaryForeground: "144.9 80.4% 10%",
      ring: "142.4 71.8% 29.2%",
      accent: "142.2 32.6% 18%",
      accentForeground: "142.1 70.6% 60%",
      secondary: "142.2 32.6% 17.5%",
      secondaryForeground: "142 40% 98%",
      muted: "142.2 32.6% 12%",
      mutedForeground: "142 20.2% 60%",
      chart1: "142 71% 45%",
      chart2: "172 61% 50%",
      chart3: "112 61% 55%",
      chart4: "82 61% 55%",
      chart5: "202 61% 50%",
    },
  },

  // 160° - Emerald
  emerald: {
    name: "emerald",
    label: "Emerald",
    light: {
      primary: "160 84% 39%",
      primaryForeground: "0 0% 100%",
      ring: "160 84% 39%",
      accent: "160 95% 92%",
      accentForeground: "160 84% 28%",
      secondary: "160 32% 90%",
      secondaryForeground: "160 84% 28%",
      muted: "160 32% 90%",
      mutedForeground: "160 16% 40%",
      chart1: "160 84% 39%",
      chart2: "140 74% 42%",
      chart3: "180 74% 38%",
      chart4: "120 64% 45%",
      chart5: "200 64% 42%",
    },
    dark: {
      primary: "160 84% 45%",
      primaryForeground: "160 84% 10%",
      ring: "160 84% 45%",
      accent: "160 32% 18%",
      accentForeground: "160 84% 60%",
      secondary: "160 32% 17%",
      secondaryForeground: "160 40% 98%",
      muted: "160 32% 12%",
      mutedForeground: "160 20% 58%",
      chart1: "160 84% 48%",
      chart2: "140 74% 50%",
      chart3: "180 74% 45%",
      chart4: "120 64% 52%",
      chart5: "200 64% 48%",
    },
  },

  // 185° - Cyan
  cyan: {
    name: "cyan",
    label: "Cyan",
    light: {
      primary: "185 94% 40%",
      primaryForeground: "0 0% 100%",
      ring: "185 94% 40%",
      accent: "185 95% 92%",
      accentForeground: "185 94% 30%",
      secondary: "185 32% 90%",
      secondaryForeground: "185 94% 30%",
      muted: "185 32% 90%",
      mutedForeground: "185 16% 40%",
      chart1: "185 94% 40%",
      chart2: "165 84% 38%",
      chart3: "205 84% 45%",
      chart4: "145 74% 40%",
      chart5: "225 74% 50%",
    },
    dark: {
      primary: "185 84% 50%",
      primaryForeground: "185 94% 10%",
      ring: "185 84% 50%",
      accent: "185 32% 20%",
      accentForeground: "185 84% 65%",
      secondary: "185 32% 17%",
      secondaryForeground: "185 40% 98%",
      muted: "185 32% 12%",
      mutedForeground: "185 20% 60%",
      chart1: "185 84% 50%",
      chart2: "165 74% 48%",
      chart3: "205 74% 55%",
      chart4: "145 64% 50%",
      chart5: "225 64% 58%",
    },
  },

  // 201° - Sky
  sky: {
    name: "sky",
    label: "Sky",
    light: {
      primary: "201 96% 32%",
      primaryForeground: "0 0% 100%",
      ring: "201 96% 32%",
      accent: "201 96% 94%",
      accentForeground: "201 96% 32%",
      secondary: "201 30% 90%",
      secondaryForeground: "201 96% 32%",
      muted: "201 30% 90%",
      mutedForeground: "201 10% 45%",
      chart1: "201 96% 32%",
      chart2: "181 86% 40%",
      chart3: "221 86% 40%",
      chart4: "201 80% 45%",
      chart5: "201 100% 30%",
    },
    dark: {
      primary: "199 89% 48%",
      primaryForeground: "0 0% 100%",
      ring: "199 89% 48%",
      accent: "199 30% 20%",
      accentForeground: "199 89% 80%",
      secondary: "199 30% 18%",
      secondaryForeground: "199 89% 80%",
      muted: "199 30% 15%",
      mutedForeground: "199 10% 65%",
      chart1: "199 89% 48%",
      chart2: "179 80% 50%",
      chart3: "219 80% 50%",
      chart4: "199 70% 60%",
      chart5: "199 90% 40%",
    },
  },

  // 221° - Blue
  blue: {
    name: "blue",
    label: "Blue",
    light: {
      primary: "221.2 83.2% 53.3%",
      primaryForeground: "210 40% 98%",
      ring: "221.2 83.2% 53.3%",
      accent: "214 95% 93%",
      accentForeground: "221.2 83.2% 53.3%",
      secondary: "214 32% 91%",
      secondaryForeground: "221.2 83.2% 43.3%",
      muted: "214 32% 91%",
      mutedForeground: "215.4 16.3% 46.9%",
      chart1: "221 83% 53%",
      chart2: "191 91% 37%",
      chart3: "251 91% 60%",
      chart4: "161 94% 30%",
      chart5: "281 83% 53%",
    },
    dark: {
      primary: "217.2 91.2% 59.8%",
      primaryForeground: "222.2 47.4% 11.2%",
      ring: "217.2 91.2% 59.8%",
      accent: "217.2 32.6% 20%",
      accentForeground: "217.2 91.2% 70%",
      secondary: "217.2 32.6% 17.5%",
      secondaryForeground: "210 40% 98%",
      muted: "217.2 32.6% 12%",
      mutedForeground: "215 20.2% 65.1%",
      chart1: "217 91% 60%",
      chart2: "187 100% 42%",
      chart3: "247 100% 70%",
      chart4: "157 100% 40%",
      chart5: "277 91% 65%",
    },
  },

  // 239° - Indigo
  indigo: {
    name: "indigo",
    label: "Indigo",
    light: {
      primary: "239 84% 67%",
      primaryForeground: "0 0% 100%",
      ring: "239 84% 67%",
      accent: "239 95% 94%",
      accentForeground: "239 84% 50%",
      secondary: "239 32% 91%",
      secondaryForeground: "239 84% 47%",
      muted: "239 32% 91%",
      mutedForeground: "239 16% 46%",
      chart1: "239 84% 67%",
      chart2: "269 84% 62%",
      chart3: "209 84% 60%",
      chart4: "299 74% 60%",
      chart5: "179 74% 50%",
    },
    dark: {
      primary: "239 84% 67%",
      primaryForeground: "0 0% 100%",
      ring: "239 84% 67%",
      accent: "239 32% 22%",
      accentForeground: "239 84% 75%",
      secondary: "239 32% 17%",
      secondaryForeground: "239 40% 98%",
      muted: "239 32% 12%",
      mutedForeground: "239 20% 65%",
      chart1: "239 84% 70%",
      chart2: "269 74% 68%",
      chart3: "209 74% 65%",
      chart4: "299 64% 65%",
      chart5: "179 64% 55%",
    },
  },

  // 262° - Violet
  violet: {
    name: "violet",
    label: "Violet",
    light: {
      primary: "262.1 83.3% 57.8%",
      primaryForeground: "210 40% 98%",
      ring: "262.1 83.3% 57.8%",
      accent: "262 95% 95%",
      accentForeground: "262.1 83.3% 47.8%",
      secondary: "262 32% 91%",
      secondaryForeground: "262.1 83.3% 47.8%",
      muted: "262 32% 91%",
      mutedForeground: "262 16.3% 46.9%",
      chart1: "262 83% 58%",
      chart2: "292 91% 53%",
      chart3: "232 91% 60%",
      chart4: "322 83% 53%",
      chart5: "202 91% 50%",
    },
    dark: {
      primary: "263.4 70% 50.4%",
      primaryForeground: "210 40% 98%",
      ring: "263.4 70% 50.4%",
      accent: "263 32.6% 22%",
      accentForeground: "263.4 70% 70%",
      secondary: "263.2 32.6% 17.5%",
      secondaryForeground: "210 40% 98%",
      muted: "263.2 32.6% 12%",
      mutedForeground: "263 20.2% 65.1%",
      chart1: "263 70% 55%",
      chart2: "293 80% 58%",
      chart3: "233 80% 65%",
      chart4: "323 70% 58%",
      chart5: "203 80% 55%",
    },
  },


  // ========================================
  // NEUTRAL COLORS (at the end)
  // ========================================

  // Neutral - Slate
  slate: {
    name: "slate",
    label: "Slate",
    light: {
      primary: "222.2 47.4% 11.2%",
      primaryForeground: "210 40% 98%",
      ring: "222.2 84% 4.9%",
      accent: "210 40% 96.1%",
      accentForeground: "222.2 47.4% 11.2%",
      secondary: "210 40% 96.1%",
      secondaryForeground: "222.2 47.4% 11.2%",
      muted: "210 40% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      chart1: "220 70% 50%",
      chart2: "160 60% 45%",
      chart3: "30 80% 55%",
      chart4: "280 65% 60%",
      chart5: "340 75% 55%",
    },
    dark: {
      primary: "210 40% 98%",
      primaryForeground: "222.2 47.4% 11.2%",
      ring: "212.7 26.8% 83.9%",
      accent: "217.2 32.6% 17.5%",
      accentForeground: "210 40% 98%",
      secondary: "217.2 32.6% 17.5%",
      secondaryForeground: "210 40% 98%",
      muted: "217.2 32.6% 12%",
      mutedForeground: "215 20.2% 65.1%",
      chart1: "220 70% 60%",
      chart2: "160 60% 55%",
      chart3: "30 80% 60%",
      chart4: "280 65% 65%",
      chart5: "340 75% 60%",
    },
  },

  // Neutral - Zinc
  zinc: {
    name: "zinc",
    label: "Zinc",
    light: {
      primary: "240 5.9% 10%",
      primaryForeground: "0 0% 98%",
      ring: "240 5.9% 10%",
      accent: "240 5% 96%",
      accentForeground: "240 5.9% 10%",
      secondary: "240 5% 96%",
      secondaryForeground: "240 5.9% 10%",
      muted: "240 5% 96%",
      mutedForeground: "240 3.8% 46%",
      chart1: "240 6% 25%",
      chart2: "240 5% 35%",
      chart3: "240 4% 45%",
      chart4: "240 3% 55%",
      chart5: "240 2% 65%",
    },
    dark: {
      primary: "0 0% 98%",
      primaryForeground: "240 5.9% 10%",
      ring: "240 3.7% 15.9%",
      accent: "240 3.7% 20%",
      accentForeground: "0 0% 98%",
      secondary: "240 3.7% 15.9%",
      secondaryForeground: "0 0% 98%",
      muted: "240 3.7% 12%",
      mutedForeground: "240 5% 65%",
      chart1: "0 0% 80%",
      chart2: "0 0% 70%",
      chart3: "0 0% 60%",
      chart4: "0 0% 50%",
      chart5: "0 0% 40%",
    },
  },

  // Neutral - Stone
  stone: {
    name: "stone",
    label: "Stone",
    light: {
      primary: "24 9.8% 10%",
      primaryForeground: "0 0% 98%",
      ring: "24 9.8% 10%",
      accent: "24 5.4% 96%",
      accentForeground: "24 9.8% 10%",
      secondary: "24 5.4% 96.1%",
      secondaryForeground: "24 9.8% 10%",
      muted: "24 5.4% 95.9%",
      mutedForeground: "24 5.4% 45.3%",
      chart1: "24 10% 25%",
      chart2: "24 10% 35%",
      chart3: "24 10% 45%",
      chart4: "24 10% 55%",
      chart5: "24 10% 65%",
    },
    dark: {
      primary: "0 0% 98%",
      primaryForeground: "24 9.8% 10%",
      ring: "24 5.7% 82.9%",
      accent: "12 6.5% 15.1%",
      accentForeground: "0 0% 98%",
      secondary: "12 6.5% 15.1%",
      secondaryForeground: "0 0% 98%",
      muted: "12 6.5% 15.1%",
      mutedForeground: "24 5.4% 63.9%",
      chart1: "0 0% 80%",
      chart2: "0 0% 70%",
      chart3: "0 0% 60%",
      chart4: "0 0% 50%",
      chart5: "0 0% 40%",
    },
  },
};

/**
 * Apply theme color to the document root - Level 3 Full Theme
 * Modifies: primary, accent, secondary, muted, chart colors
 */
export function applyThemeColor(color: string, isDark: boolean) {
  const theme = THEME_COLORS[color];
  if (!theme) return;

  const colors = isDark ? theme.dark : theme.light;
  const root = document.documentElement;

  // Primary colors
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--primary-foreground", colors.primaryForeground);
  root.style.setProperty("--ring", colors.ring);

  // Accent colors (Level 2)
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-foreground", colors.accentForeground);

  // Secondary & Muted (Level 3)
  root.style.setProperty("--secondary", colors.secondary);
  root.style.setProperty("--secondary-foreground", colors.secondaryForeground);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--muted-foreground", colors.mutedForeground);

  // Chart colors (Level 3)
  root.style.setProperty("--chart-1", colors.chart1);
  root.style.setProperty("--chart-2", colors.chart2);
  root.style.setProperty("--chart-3", colors.chart3);
  root.style.setProperty("--chart-4", colors.chart4);
  root.style.setProperty("--chart-5", colors.chart5);
}
