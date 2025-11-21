// Theme color presets following shadcn theming best practices
// Each theme defines CSS variables for light and dark modes

export interface ThemeColors {
    name: string;
    label: string;
    light: {
        primary: string;
        primaryForeground: string;
        ring: string;
    };
    dark: {
        primary: string;
        primaryForeground: string;
        ring: string;
    };
}

export const THEME_COLORS: Record<string, ThemeColors> = {
    slate: {
        name: 'slate',
        label: 'Slate',
        light: {
            primary: '222.2 47.4% 11.2%',
            primaryForeground: '210 40% 98%',
            ring: '222.2 84% 4.9%',
        },
        dark: {
            primary: '210 40% 98%',
            primaryForeground: '222.2 47.4% 11.2%',
            ring: '212.7 26.8% 83.9%',
        },
    },
    blue: {
        name: 'blue',
        label: 'Blue',
        light: {
            primary: '221.2 83.2% 53.3%',
            primaryForeground: '210 40% 98%',
            ring: '221.2 83.2% 53.3%',
        },
        dark: {
            primary: '217.2 91.2% 59.8%',
            primaryForeground: '222.2 47.4% 11.2%',
            ring: '212.7 26.8% 83.9%',
        },
    },
    violet: {
        name: 'violet',
        label: 'Violet',
        light: {
            primary: '262.1 83.3% 57.8%',
            primaryForeground: '210 40% 98%',
            ring: '262.1 83.3% 57.8%',
        },
        dark: {
            primary: '263.4 70% 50.4%',
            primaryForeground: '210 40% 98%',
            ring: '263.4 70% 50.4%',
        },
    },
    green: {
        name: 'green',
        label: 'Green',
        light: {
            primary: '142.1 76.2% 36.3%',
            primaryForeground: '355.7 100% 97.3%',
            ring: '142.1 76.2% 36.3%',
        },
        dark: {
            primary: '142.1 70.6% 45.3%',
            primaryForeground: '144.9 80.4% 10%',
            ring: '142.4 71.8% 29.2%',
        },
    },
    orange: {
        name: 'orange',
        label: 'Orange',
        light: {
            primary: '24.6 95% 53.1%',
            primaryForeground: '60 9.1% 97.8%',
            ring: '24.6 95% 53.1%',
        },
        dark: {
            primary: '20.5 90.2% 48.2%',
            primaryForeground: '60 9.1% 97.8%',
            ring: '20.5 90.2% 48.2%',
        },
    },
    rose: {
        name: 'rose',
        label: 'Rose',
        light: {
            primary: '346.8 77.2% 49.8%',
            primaryForeground: '355.7 100% 97.3%',
            ring: '346.8 77.2% 49.8%',
        },
        dark: {
            primary: '346.8 77.2% 49.8%',
            primaryForeground: '355.7 100% 97.3%',
            ring: '346.8 77.2% 49.8%',
        },
    },
    zinc: {
        name: 'zinc',
        label: 'Zinc',
        light: {
            primary: '240 5.9% 10%',
            primaryForeground: '0 0% 98%',
            ring: '240 5.9% 10%',
        },
        dark: {
            primary: '0 0% 98%',
            primaryForeground: '240 5.9% 10%',
            ring: '240 3.7% 15.9%',
        },
    },
};

export function applyThemeColor(color: string, isDark: boolean) {
    const theme = THEME_COLORS[color];
    if (!theme) return;

    const colors = isDark ? theme.dark : theme.light;

    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', colors.primaryForeground);
    root.style.setProperty('--ring', colors.ring);
}
