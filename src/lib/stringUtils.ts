
/**
 * Calculates the Levenshtein distance between two strings.
 * This metric represents the minimum number of single-character edits (insertions, deletions, or substitutions)
 * required to change one word into the other.
 */
export function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Calculate distance
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Normalizes a string for comparison (lowercase, trim, remove extra spaces).
 */
export function normalizeString(str: string): string {
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Finds the best match for a target string from a list of candidates.
 * Returns the candidate and distance if within threshold, otherwise null.
 */
export function findBestMatch(
    target: string,
    candidates: string[],
    threshold: number = 2
): { match: string; distance: number } | null {
    const normalizedTarget = normalizeString(target);
    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const candidate of candidates) {
        const normalizedCandidate = normalizeString(candidate);

        // Quick check: if normalized strings are identical, distance is 0
        if (normalizedTarget === normalizedCandidate) {
            return { match: candidate, distance: 0 };
        }

        const distance = levenshteinDistance(normalizedTarget, normalizedCandidate);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = candidate;
        }
    }

    if (bestMatch && bestDistance <= threshold) {
        return { match: bestMatch, distance: bestDistance };
    }

    return null;
}
