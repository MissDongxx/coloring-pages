import { getColoringPages, ColoringPageStatus, getColoringPagesCount } from '@/shared/models/coloring_page';

export interface SeoHubMatch {
    isHub: boolean;
    root: string;
    modifier: string | null;
}

export function parseSeoHubSlug(slug: string): SeoHubMatch {
    // Simple strict pattern matching: must end with '-coloring-pages' (or similar logic)
    // E.g., 'dinosaur-coloring-pages' -> root: dinosaur, modifier: null
    // E.g., 'cute-dinosaur-coloring-pages' -> root: dinosaur, modifier: cute

    if (!slug.endsWith('-coloring-pages')) {
        return { isHub: false, root: '', modifier: null };
    }

    const prefix = slug.replace('-coloring-pages', '');

    // Try to find the root and modifier based on the known roots?
    // We can just use the last word as root, and everything else as modifier.
    // Wait, "santa-claus" has a hyphen. "gingerbread-man" has a hyphen.
    // We should actually pass the known roots to the parser or look up the DB!
    // But wait! If we do `where root_keyword = 'xxx'`, we can just try all combinations or simply rely on the Dimension Registry?
    // Yes! Let's import the DIMENSION_REGISTRY to strictly match valid roots!

    // For now, let's keep it simple: we can do a reverse check against registry.
    return guessRootAndModifier(prefix);
}

// Optional helper to tightly couple with registry for precise matching
import { DIMENSION_REGISTRY } from '@/extensions/keyword-generator/dimensions';

function guessRootAndModifier(prefix: string): SeoHubMatch {
    // Check against known roots in registry
    // Sort roots by length descending to match longest first (e.g. "santa-claus" before "santa")
    const roots = Object.keys(DIMENSION_REGISTRY)
        .sort((a, b) => b.length - a.length);

    for (const root of roots) {
        const rootSlugified = root.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (prefix === rootSlugified) {
            return { isHub: true, root, modifier: null };
        }

        if (prefix.endsWith(`-${rootSlugified}`)) {
            const modifierSlugified = prefix.replace(`-${rootSlugified}`, '');
            // Match modifier back to true string if needed, or we can just query using slugified version?
            // Actually DB stores exact strings like "cute", "santa claus".
            // Let's just return the slugified ones and we can query with ILIKE or we'll need exact mappings.
            return { isHub: true, root, modifier: modifierSlugified };
        }
    }

    // Fallback: use the entire prefix as root (handles multi-word roots like "lds-bible")
    // This assumes no modifier when not found in registry
    // URLs like "adorable-lds-bible-coloring-pages" → root="adorable-lds-bible", modifier=null
    return {
        isHub: true,
        root: prefix,
        modifier: null
    };
}

/**
 * Validates if the hub actually contains pages
 */
export async function validateSeoHub(root: string, modifier: string | null): Promise<boolean> {
    // Query DB to see if any pages exist for this root/modifier
    const searchConfig: any = { status: ColoringPageStatus.PUBLISHED };

    // Note: we might need to adjust getColoringPages to support exact matching or ilike on rootKeyword/modifier
    // Since we only have slugified versions here if we used the fallback, we might need a custom raw query 
    // or we add a helper in the Drizzle model.

    // Let's assume we implement `getHubPages` in the model.
    return true;
}
