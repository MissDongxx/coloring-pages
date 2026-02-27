/**
 * Helper utilities for AI-generated coloring pages
 * - Upload images to R2
 * - Auto-categorize by prompt keywords
 * - Generate SEO metadata
 * - Prompt-based caching
 */

import { md5 } from '@/shared/lib/hash';
import { getStorageService } from '@/shared/services/storage';
import {
    createColoringPage,
    findColoringPage,
    ColoringPageStatus,
} from '@/shared/models/coloring_page';

// ─── Category Mapping ────────────────────────────────────────────────────────
// Maps keywords to categories for auto-classification
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    animals: [
        'cat', 'dog', 'puppy', 'kitten', 'bunny', 'rabbit', 'bird', 'fish',
        'horse', 'pony', 'elephant', 'lion', 'tiger', 'bear', 'fox', 'owl',
        'butterfly', 'dolphin', 'whale', 'turtle', 'frog', 'monkey', 'panda',
        'penguin', 'duck', 'chicken', 'cow', 'pig', 'sheep', 'goat', 'deer',
        'wolf', 'snake', 'dinosaur', 'dragon', 'animal', 'pet', 'zoo',
        'giraffe', 'zebra', 'hippo', 'crocodile', 'alligator', 'parrot',
    ],
    nature: [
        'flower', 'tree', 'forest', 'garden', 'mountain', 'river', 'ocean',
        'sea', 'beach', 'lake', 'sunset', 'sunrise', 'sun', 'moon', 'star',
        'rain', 'snow', 'cloud', 'rainbow', 'leaf', 'plant', 'rose', 'tulip',
        'daisy', 'landscape', 'waterfall', 'meadow', 'field', 'sky',
    ],
    vehicles: [
        'car', 'truck', 'bus', 'train', 'airplane', 'plane', 'helicopter',
        'boat', 'ship', 'bicycle', 'motorcycle', 'rocket', 'spaceship',
        'submarine', 'tractor', 'ambulance', 'fire truck', 'police car',
        'race car', 'vehicle', 'van',
    ],
    fantasy: [
        'unicorn', 'fairy', 'mermaid', 'wizard', 'witch', 'magic', 'castle',
        'prince', 'princess', 'knight', 'elf', 'dwarf', 'troll', 'goblin',
        'phoenix', 'pegasus', 'centaur', 'fantasy', 'enchanted', 'mythical',
        'magical', 'sorcerer',
    ],
    holidays: [
        'christmas', 'easter', 'halloween', 'thanksgiving', 'valentine',
        'birthday', 'new year', 'holiday', 'celebration', 'party', 'gift',
        'present', 'santa', 'snowman', 'pumpkin', 'turkey', 'firework',
    ],
    food: [
        'cake', 'cookie', 'ice cream', 'pizza', 'fruit', 'apple', 'banana',
        'strawberry', 'chocolate', 'candy', 'cupcake', 'donut', 'bread',
        'sandwich', 'burger', 'food', 'dessert', 'pie', 'watermelon', 'grape',
    ],
    sports: [
        'soccer', 'football', 'basketball', 'baseball', 'tennis', 'swimming',
        'running', 'cycling', 'skateboard', 'surfing', 'skiing', 'sport',
        'ball', 'gym', 'yoga', 'dance', 'ballet',
    ],
    characters: [
        'boy', 'girl', 'kid', 'child', 'baby', 'family', 'people', 'person',
        'superhero', 'robot', 'pirate', 'cowboy', 'ninja', 'clown', 'astronaut',
        'character', 'figure', 'man', 'woman',
    ],
    mandala: [
        'mandala', 'pattern', 'geometric', 'abstract', 'zentangle', 'mosaic',
        'kaleidoscope', 'symmetry', 'ornament', 'decorative',
    ],
    space: [
        'space', 'planet', 'galaxy', 'astronaut', 'alien', 'ufo', 'mars',
        'jupiter', 'saturn', 'cosmos', 'nebula', 'constellation',
    ],
};

// ─── Auto-categorize by Prompt ──────────────────────────────────────────────
export function categorizeByPrompt(prompt: string): {
    category: string;
    keyword: string;
} {
    const lower = prompt.toLowerCase();

    // Try to find matching category
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const kw of keywords) {
            if (lower.includes(kw)) {
                return { category, keyword: kw };
            }
        }
    }

    // Default
    return { category: 'general', keyword: 'coloring-page' };
}

// ─── Generate Slug from Prompt ──────────────────────────────────────────────
/**
 * Generate slug from prompt:
 * - Short prompts (≤ 7 words): use full prompt
 * - Long prompts (> 7 words): extract key words
 */
export function generateSlug(prompt: string): string {
    // Clean the prompt: remove style additions and special characters
    const cleaned = prompt
        .replace(/,?\s*(black and white|white background|coloring page|classic style|thick lines|simple|cute|kids style).*$/gi, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '') // remove special chars except spaces and hyphens
        .trim();

    const words = cleaned.split(/\s+/).filter(w => w.length > 0);

    let slugWords: string[];
    const WORD_THRESHOLD = 7; // Threshold for short vs long prompts

    if (words.length <= WORD_THRESHOLD) {
        // Short prompt: use all words
        slugWords = words;
    } else {
        // Long prompt: extract key words
        // First, try to find category keywords
        const { keyword } = categorizeByPrompt(prompt);

        // Use category keyword + first 2 meaningful words from prompt
        const firstWords = words.slice(0, 2);
        slugWords = [keyword, ...firstWords].filter((w, i, arr) => arr.indexOf(w) === i); // dedupe
    }

    const slug = slugWords
        .map(w => w.toLowerCase())
        .join('-');

    // Add a short hash suffix for uniqueness (avoid conflicts with same prompt)
    const hash = md5(prompt).slice(0, 4);
    const baseSlug = slug || 'coloring-page';
    return `${baseSlug}-${hash}`;
}

// ─── Generate Title from Prompt ─────────────────────────────────────────────
export function generateTitle(prompt: string): string {
    // Clean up the prompt: remove style additions, take the user part
    const cleaned = prompt
        .replace(/,?\s*classic style.*$/i, '')
        .replace(/,?\s*white background.*$/i, '')
        .replace(/,?\s*coloring page.*$/i, '')
        .replace(/,?\s*contrast black.*$/i, '')
        .replace(/,?\s*thin thickness.*$/i, '')
        .trim();

    if (!cleaned) return 'Coloring Page';

    // Capitalize first letter of each word
    return cleaned
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') + ' Coloring Page';
}

// ─── Generate SEO Description ───────────────────────────────────────────────
export function generateSEODescription(
    title: string,
    category: string,
    keyword: string
): string {
    return `Download and color this free ${title.toLowerCase()}. A beautiful ${category} themed coloring page featuring ${keyword}. Perfect for kids and adults who love coloring!`;
}

// ─── Generate SEO Keywords ──────────────────────────────────────────────────
export function generateSEOKeywords(
    prompt: string,
    category: string,
    keyword: string
): string[] {
    const baseKeywords = [
        'coloring page',
        'free coloring page',
        'printable coloring page',
        category + ' coloring page',
        keyword + ' coloring page',
    ];

    // Extract additional keywords from prompt
    const words = prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3);

    const unique = [...new Set([...baseKeywords, ...words])];
    return unique.slice(0, 15);
}

// ─── Upload Generated Image to R2 ──────────────────────────────────────────
export async function uploadGeneratedImageToR2(
    imageUrl: string,
    prompt: string
): Promise<{ success: boolean; r2Url?: string; error?: string }> {
    try {
        const storageService = await getStorageService();

        const slug = generateSlug(prompt);
        // Use absolute path (starting with /) to avoid adding uploadPath prefix
        const key = `/coloring-pages/generated/${slug}.png`;

        // Check if already uploaded
        const exists = await storageService.exists({ key });
        if (exists) {
            const publicUrl = storageService.getPublicUrl({ key });
            if (publicUrl) {
                console.log('[coloring-helper] R2 cache hit:', key);
                return { success: true, r2Url: publicUrl };
            }
        }

        console.log('[coloring-helper] Uploading to R2:', key);

        // Download and upload to R2
        const result = await storageService.downloadAndUpload({
            url: imageUrl,
            key,
            contentType: 'image/png',
            disposition: 'inline',
        });

        if (!result.success) {
            console.error('[coloring-helper] R2 upload failed:', result.error);
            return { success: false, error: result.error };
        }

        console.log('[coloring-helper] R2 upload success:', result.url);
        return { success: true, r2Url: result.url };
    } catch (error: any) {
        console.error('[coloring-helper] Upload error:', error.message);
        return { success: false, error: error.message };
    }
}

// ─── Upload Generated Image to R2 with Custom Slug ───────────────────────────
export async function uploadGeneratedImageToR2WithSlug(
    imageUrl: string,
    slug: string
): Promise<{ success: boolean; r2Url?: string; error?: string }> {
    try {
        const storageService = await getStorageService();

        // Use absolute path (starting with /) to avoid adding uploadPath prefix
        const key = `/coloring-pages/generated/${slug}.png`;

        // Check if already uploaded
        const exists = await storageService.exists({ key });
        if (exists) {
            const publicUrl = storageService.getPublicUrl({ key });
            if (publicUrl) {
                console.log('[coloring-helper] R2 cache hit:', key);
                return { success: true, r2Url: publicUrl };
            }
        }

        console.log('[coloring-helper] Uploading to R2:', key);

        // Download and upload to R2
        const result = await storageService.downloadAndUpload({
            url: imageUrl,
            key,
            contentType: 'image/png',
            disposition: 'inline',
        });

        if (!result.success) {
            console.error('[coloring-helper] R2 upload failed:', result.error);
            return { success: false, error: result.error };
        }

        console.log('[coloring-helper] R2 upload success:', result.url);
        return { success: true, r2Url: result.url };
    } catch (error: any) {
        console.error('[coloring-helper] Upload error:', error.message);
        return { success: false, error: error.message };
    }
}

// ─── Create Coloring Page from Generated Image ─────────────────────────────
export async function createColoringPageFromGenerated(params: {
    userId: string;
    prompt: string;
    imageUrl: string;
    status?: ColoringPageStatus;
    uniqueId?: string; // Optional unique ID to avoid conflicts (e.g., taskId for image-to-image)
}): Promise<{
    success: boolean;
    coloringPage?: any;
    error?: string;
}> {
    try {
        const { userId, prompt, imageUrl, status = ColoringPageStatus.PUBLISHED, uniqueId } = params;

        // Generate slug with optional unique ID suffix to avoid conflicts
        const baseSlug = generateSlug(prompt);
        const slug = uniqueId ? `${baseSlug}-${uniqueId.slice(0, 8)}` : baseSlug;

        const title = generateTitle(prompt);
        const { category, keyword } = categorizeByPrompt(prompt);
        const description = generateSEODescription(title, category, keyword);

        // Check if coloring page with this slug already exists
        const existing = await findColoringPage({ slug });
        if (existing) {
            return { success: true, coloringPage: existing };
        }

        // Upload to R2 with the unique slug
        const uploadResult = await uploadGeneratedImageToR2WithSlug(imageUrl, slug);
        const finalImageUrl = uploadResult.r2Url || imageUrl;

        // Create coloring page
        const page = await createColoringPage({
            userId,
            slug,
            title,
            description,
            category,
            keyword,
            prompt,
            imageUrl: finalImageUrl,
            status,
            sort: 0,
        });

        console.log(
            `[coloring-helper] Created coloring page: ${page.id} (${slug}), category: ${category}`
        );

        return { success: true, coloringPage: page };
    } catch (error: any) {
        console.error('[coloring-helper] Create page error:', error.message);
        return { success: false, error: error.message };
    }
}

// ─── Check Prompt Cache ─────────────────────────────────────────────────────
/**
 * Check if a coloring page already exists for this prompt.
 * Returns the existing page if found, null otherwise.
 */
export async function checkPromptCache(prompt: string): Promise<any | null> {
    try {
        const slug = generateSlug(prompt);
        const existing = await findColoringPage({ slug });

        if (existing && existing.imageUrl) {
            console.log(`[coloring-helper] Cache hit for prompt: "${prompt.slice(0, 50)}..."`);
            return existing;
        }

        return null;
    } catch (error) {
        console.error('[coloring-helper] Cache check error:', error);
        return null;
    }
}
