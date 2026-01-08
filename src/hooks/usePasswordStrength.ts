import { useState, useEffect } from 'react';

// Define result type locally to avoid hard dependency on the library in this file
// until it's loaded
interface StrengthResult {
    score: number; // 0-4
    feedback: {
        warning?: string;
        suggestions: string[];
    };
}

const defaultResult: StrengthResult = {
    score: 0,
    feedback: { suggestions: [] },
};

export function usePasswordStrength(password: string) {
    const [result, setResult] = useState<StrengthResult>(defaultResult);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!password) {
            setResult(defaultResult);
            return;
        }

        let isMounted = true;
        const calculateStrength = async () => {
            setIsLoading(true);
            try {
                // Dynamic imports for code splitting
                const { zxcvbn, zxcvbnOptions } = await import('@zxcvbn-ts/core');
                const { dictionary, translations } = await import('@zxcvbn-ts/language-en');

                // Initialize configuration (only needs to be done once, but safe to repeat)
                zxcvbnOptions.setOptions({
                    dictionary: {
                        ...dictionary,
                    },
                    translations,
                });

                const strength = zxcvbn(password);

                if (isMounted) {
                    setResult({
                        score: strength.score,
                        feedback: {
                            warning: strength.feedback.warning || undefined,
                            suggestions: strength.feedback.suggestions,
                        },
                    });
                }
            } catch (error) {
                console.error("Failed to load password strength library", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        // Debounce to avoid calculation on every keystroke if user types fast
        const timeoutId = setTimeout(calculateStrength, 300);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [password]);

    return { ...result, isLoading };
}
