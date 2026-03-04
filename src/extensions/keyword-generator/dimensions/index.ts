import type { KeywordData } from '../types';
import type { DimensionConfig } from './types';
import { christmasConfig } from './christmas';
import { dinosaurConfig } from './dinosaur';
import { unicornConfig } from './unicorn';
import { roseConfig } from './rose';

export const DIMENSION_REGISTRY: Record<string, DimensionConfig> = {
    christmas: christmasConfig,
    dinosaur: dinosaurConfig,
    unicorn: unicornConfig,
    rose: roseConfig,
};

// Extend KeywordData to support rootKeyword and modifier
// (Now integrated into KeywordData directly, using KeywordData)

export class DimensionGenerator {
    /**
     * Generates unique keywords based on a dimension configuration.
     * @param config The DimensionConfig containing root, dimensions, and patterns
     * @param category The original content category (e.g. 'animals')
     * @param count Target number of keywords to generate
     * @param maxLength Maximum length of any generated keyword
     */
    static generate(
        config: DimensionConfig,
        category: string,
        count: number = 300,
        maxLength: number = 60
    ): KeywordData[] {
        const results = new Map<string, KeywordData>();
        const { root, dimensions, patterns } = config;

        // Helper to get a random item from an array
        const pickRandom = <T>(arr: T[]): T | null => {
            if (!arr || arr.length === 0) return null;
            return arr[Math.floor(Math.random() * arr.length)];
        };

        // Helper to extract variables from a pattern
        const getVariables = (pattern: string) => {
            const matches = pattern.match(/\{([^}]+)\}/g);
            return matches ? matches.map((m) => m.slice(1, -1)) : [];
        };

        // Enforce Core Pages First:
        // Generate the exact root phrase (usually pattern with only {root})
        // and pure style hubs if applicable.

        // 1. Exact Root Hub
        const rootKeywordStr = root.trim();
        if (rootKeywordStr.length <= maxLength) {
            results.set(rootKeywordStr, {
                category,
                keyword: rootKeywordStr,
                rootKeyword: root,
                modifier: '',
            });
        }

        // 2. Pure SubHubs (Style/Audience + Root)
        // We'll try to generate simple hubs like "{style} {root}"
        if (dimensions['style']) {
            for (const style of dimensions['style']) {
                const subHubStr = `${style} ${root}`.trim();
                if (subHubStr.length <= maxLength && !results.has(subHubStr)) {
                    results.set(subHubStr, {
                        category,
                        keyword: subHubStr,
                        rootKeyword: root,
                        modifier: style,
                    });
                }
            }
        }

        // Generation loop for longtail
        let attempts = 0;
        const maxAttempts = count * 10; // Prevent infinite loops

        while (results.size < count && attempts < maxAttempts) {
            attempts++;

            const pattern = pickRandom(patterns);
            if (!pattern) continue;

            const vars = getVariables(pattern);
            let generatedString = pattern;
            let usedModifier = ''; // We track the dominant modifier extracted from generation

            // Ensure root replacement
            generatedString = generatedString.replace('{root}', root);

            let skip = false;
            for (const v of vars) {
                if (v === 'root') continue;

                const replacement = pickRandom(dimensions[v] || []);
                if (!replacement) {
                    skip = true;
                    break; // Missing dimension value, skip this pattern
                }

                generatedString = generatedString.replace(`{${v}}`, replacement);

                // Naively capture the first style or character as the modifier, 
                // prioritizing style if it matches.
                if (!usedModifier && (v === 'style' || v === 'character')) {
                    usedModifier = replacement;
                }
            }

            if (skip) continue;

            generatedString = generatedString.trim().replace(/\s+/g, ' ');

            if (generatedString.length <= maxLength && !results.has(generatedString)) {
                results.set(generatedString, {
                    category,
                    keyword: generatedString,
                    rootKeyword: root,
                    modifier: usedModifier || '',
                });
            }
        }

        return Array.from(results.values());
    }
}
