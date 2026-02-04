/**
 * Keyword generator types
 */

export interface KeywordGeneratorOptions {
  source: 'word_roots' | 'auto_generated';
  wordRoots?: string[];
  categories?: Array<{ name: string; count: number }>;
  count?: number;
  promptTemplate?: string;
}

export interface KeywordData {
  category: string;
  keyword: string;
}

export interface KeywordWithPrompt extends KeywordData {
  prompt: string;
}

export interface KeywordGenerateResult {
  keywords: KeywordWithPrompt[];
  csvContent: string;
  csvPath: string;
}

export interface CategoryMap {
  [category: string]: string[];
}

// Common coloring page categories
export const DEFAULT_CATEGORIES = [
  { name: 'animals', count: 20 },
  { name: 'nature', count: 15 },
  { name: 'transportation', count: 10 },
  { name: 'food', count: 15 },
  { name: 'holidays', count: 10 },
  { name: 'fantasy', count: 10 },
  { name: 'sports', count: 10 },
  { name: 'space', count: 10 },
];
