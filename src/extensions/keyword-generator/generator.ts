/**
 * Keyword generator for coloring pages
 * Uses AI to generate keywords from word roots or auto-generate
 */

import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import type {
  CategoryMap,
  KeywordData,
  KeywordGenerateResult,
  KeywordGeneratorOptions,
  KeywordWithPrompt,
} from './types';
import { DEFAULT_CATEGORIES } from './types';

/**
 * Prompt template based on Coloring-Book-Z-Image-Turbo-LoRA format
 */
const DEFAULT_PROMPT_TEMPLATE =
  'A coloring page of {keyword}, black and white line art, simple outlines, suitable for children coloring, clean design, no shading';

/**
 * Keyword generator class
 */
export class KeywordGenerator {
  private promptTemplate: string;

  constructor(promptTemplate?: string) {
    this.promptTemplate = promptTemplate || DEFAULT_PROMPT_TEMPLATE;
  }

  /**
   * Generate keywords from word roots using AI
   */
  async generateFromRoots(
    roots: string[],
    countPerRoot: number = 5
  ): Promise<KeywordData[]> {
    const keywords: KeywordData[] = [];

    // For each root, generate variations
    for (const root of roots) {
      const variations = await this.generateVariations(root, countPerRoot);
      keywords.push(...variations);
    }

    return keywords;
  }

  /**
   * Auto-generate keywords across categories
   */
  async autoGenerate(
    categories: Array<{ name: string; count: number }> = DEFAULT_CATEGORIES
  ): Promise<KeywordData[]> {
    const keywords: KeywordData[] = [];

    for (const category of categories) {
      const categoryKeywords = await this.generateCategoryKeywords(
        category.name,
        category.count
      );
      keywords.push(...categoryKeywords);
    }

    return keywords;
  }

  /**
   * Generate variations of a word root
   * This would typically call an AI API, but for now we'll use simple variations
   */
  private async generateVariations(
    root: string,
    count: number
  ): Promise<KeywordData[]> {
    // Simple variations - in production, this would call an AI API
    const variations: KeywordData[] = [];

    // Common patterns for coloring pages
    const prefixes = [
      'cute',
      'simple',
      'cartoon',
      'adorable',
      'happy',
      'friendly',
      'easy',
    ];
    const suffixes = [
      'for kids',
      'drawing',
      'outline',
      'sketch',
      'template',
      'design',
    ];

    // Add the base keyword
    variations.push({
      category: this.guessCategory(root),
      keyword: root,
    });

    // Add variations
    for (let i = 0; i < count - 1; i++) {
      if (i < prefixes.length) {
        variations.push({
          category: this.guessCategory(root),
          keyword: `${prefixes[i]} ${root}`,
        });
      } else if (i - prefixes.length < suffixes.length) {
        variations.push({
          category: this.guessCategory(root),
          keyword: `${root} ${suffixes[i - prefixes.length]}`,
        });
      } else {
        variations.push({
          category: this.guessCategory(root),
          keyword: `${root} ${i + 1}`,
        });
      }
    }

    return variations.slice(0, count);
  }

  /**
   * Generate keywords for a specific category
   */
  private async generateCategoryKeywords(
    category: string,
    count: number
  ): Promise<KeywordData[]> {
    // Category-specific keyword lists
    const categoryKeywords: Record<string, string[]> = {
      animals: [
        'butterfly',
        'cat',
        'dog',
        'elephant',
        'lion',
        'tiger',
        'bear',
        'rabbit',
        'bird',
        'fish',
        'dinosaur',
        'dragon',
        'horse',
        'pig',
        'cow',
        'sheep',
        'duck',
        'frog',
        'turtle',
        'snake',
      ],
      nature: [
        'flower',
        'tree',
        'leaf',
        'mountain',
        'sun',
        'moon',
        'star',
        'cloud',
        'rain',
        'snowflake',
        'rainbow',
        'ocean wave',
        'palm tree',
        'cactus',
        'mushroom',
      ],
      transportation: [
        'car',
        'truck',
        'bus',
        'train',
        'airplane',
        'helicopter',
        'boat',
        'ship',
        'bicycle',
        'rocket',
        'scooter',
        'tractor',
        'police car',
        'fire truck',
        'ambulance',
      ],
      food: [
        'apple',
        'banana',
        'orange',
        'strawberry',
        'pizza',
        'hamburger',
        'ice cream',
        'cake',
        'cookie',
        'candy',
        'cupcake',
        'donut',
        'watermelon',
        'grapes',
        'carrot',
      ],
      holidays: [
        'christmas tree',
        'santa claus',
        'easter egg',
        'pumpkin',
        'turkey',
        'valentine heart',
        'flag',
        'fireworks',
        'snowman',
        'wreath',
      ],
      fantasy: [
        'unicorn',
        'mermaid',
        'fairy',
        'dragon',
        'castle',
        'knight',
        'princess',
        'wizard',
        'magic wand',
        'enchanted forest',
      ],
      sports: [
        'basketball',
        'soccer ball',
        'football',
        'baseball',
        'tennis racket',
        'golf club',
        'hockey stick',
        'bowling ball',
        'volleyball',
        'swimming',
      ],
      space: [
        'astronaut',
        'rocket',
        'planet',
        'alien',
        'ufo',
        'star',
        'moon',
        'satellite',
        'comet',
        'galaxy',
      ],
    };

    const available = categoryKeywords[category] || [];
    const selected = available.slice(0, Math.min(count, available.length));

    return selected.map((keyword) => ({
      category,
      keyword,
    }));
  }

  /**
   * Guess category from keyword
   */
  private guessCategory(keyword: string): string {
    const lower = keyword.toLowerCase();

    if (
      [
        'animal',
        'dog',
        'cat',
        'bird',
        'fish',
        'lion',
        'tiger',
        'bear',
      ].includes(lower)
    )
      return 'animals';
    if (['flower', 'tree', 'leaf', 'sun', 'moon', 'star'].includes(lower))
      return 'nature';
    if (['car', 'truck', 'bus', 'train', 'plane', 'boat'].includes(lower))
      return 'transportation';
    if (['fruit', 'food', 'pizza', 'cake', 'ice cream'].some((v) =>
      lower.includes(v)
    ))
      return 'food';
    if (['christmas', 'santa', 'easter', 'halloween'].includes(lower))
      return 'holidays';
    if (['unicorn', 'fairy', 'dragon', 'castle', 'magic'].includes(lower))
      return 'fantasy';
    if (
      ['ball', 'sport', 'game', 'basketball', 'soccer'].some((v) =>
        lower.includes(v)
      )
    )
      return 'sports';
    if (['space', 'rocket', 'planet', 'star', 'alien'].includes(lower))
      return 'space';

    return 'general';
  }

  /**
   * Categorize keywords into a map
   */
  categorizeKeywords(keywords: KeywordData[]): CategoryMap {
    const map: CategoryMap = {};

    for (const data of keywords) {
      if (!map[data.category]) {
        map[data.category] = [];
      }
      map[data.category].push(data.keyword);
    }

    return map;
  }

  /**
   * Generate prompts for keywords
   */
  generatePrompts(keywords: KeywordData[]): KeywordWithPrompt[] {
    return keywords.map((data) => ({
      ...data,
      prompt: this.generatePrompt(data.keyword),
    }));
  }

  /**
   * Generate a prompt for a single keyword
   */
  private generatePrompt(keyword: string): string {
    return this.promptTemplate.replace(/{keyword}/g, keyword);
  }

  /**
   * Export keywords to CSV format
   */
  async exportToCSV(
    data: KeywordWithPrompt[],
    outputPath: string
  ): Promise<string> {
    const csvData = data.map((item) => ({
      category: item.category,
      keyword: item.keyword,
      prompt: item.prompt,
    }));

    const csv = Papa.unparse(csvData, {
      quotes: true,
      delimiter: ',',
      header: true,
    });

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Write CSV file
    await fs.writeFile(outputPath, csv, 'utf-8');

    return csv;
  }

  /**
   * Generate keywords with prompts and export to CSV
   */
  async generate(options: KeywordGeneratorOptions): Promise<KeywordGenerateResult> {
    let keywords: KeywordData[];

    if (options.source === 'word_roots' && options.wordRoots) {
      keywords = await this.generateFromRoots(
        options.wordRoots,
        options.count || 5
      );
    } else {
      keywords = await this.autoGenerate(options.categories);
    }

    // Generate prompts
    const keywordsWithPrompts = this.generatePrompts(keywords);

    // Export to CSV
    const csvPath = path.join(process.cwd(), 'temp', 'my-keywords.csv');
    const csvContent = await this.exportToCSV(keywordsWithPrompts, csvPath);

    return {
      keywords: keywordsWithPrompts,
      csvContent,
      csvPath,
    };
  }
}

/**
 * Create keyword generator instance
 */
export function createKeywordGenerator(
  promptTemplate?: string
): KeywordGenerator {
  return new KeywordGenerator(promptTemplate);
}
