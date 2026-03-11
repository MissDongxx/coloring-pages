/**
 * Local Keywords Service
 * Fetches and updates keywords from local CSV file
 */

interface KeywordRow {
  'root-keyword': string;
  'root-num': string;
  'keyword-raw': string;
  'keyword': string;
  'index': string;
  'created': string;
}

interface Keyword {
  rootKeyword: string;
  rootNum: number;
  keywordRaw: string;
  keyword: string;
  index: number;
  created: number;
}

export interface PendingKeywordResult {
  keywords: string[];  // Array of root keywords to process
  ids: number[];       // Array of indices for updating
  count: number;       // Number of keywords found (1 or 2)
}

const KEYWORDS_FILE = 'keywords.csv';

/**
 * Read keywords from local CSV file
 */
async function readKeywordsFromFile(): Promise<Keyword[]> {
  const fs = await import('fs');
  const path = await import('path');

  const filePath = path.join(process.cwd(), KEYWORDS_FILE);

  if (!fs.existsSync(filePath)) {
    console.warn(`[LocalKeywords] Keywords file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const keywords: Keyword[] = [];

  for (const line of lines) {
    // Skip header line
    if (line.startsWith('root-keyword')) {
      continue;
    }

    // Parse CSV line
    const parts = line.split(',').map(p => p.trim());

    if (parts.length >= 6) {
      keywords.push({
        rootKeyword: parts[0],
        rootNum: parseInt(parts[1], 10) || 0,
        keywordRaw: parts[2],
        keyword: parts[3],
        index: parseInt(parts[4], 10) || 0,
        created: parseInt(parts[5], 10) || 0,
      });
    }
  }

  return keywords;
}

/**
 * Write keywords to local CSV file
 */
async function writeKeywordsToFile(keywords: Keyword[]): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  const filePath = path.join(process.cwd(), KEYWORDS_FILE);

  const header = 'root-keyword,root-num,keyword-raw,keyword,index,created';
  const rows = keywords.map(kw =>
    `${kw.rootKeyword},${kw.rootNum},${kw.keywordRaw},${kw.keyword},${kw.index},${kw.created}`
  ).join('\n');

  const content = `${header}\n${rows}`;

  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Get pending keywords from local file (created = 0)
 * Returns 1-2 keywords (whichever is available, max 2)
 */
export async function getPendingKeywords(): Promise<PendingKeywordResult | null> {
  try {
    const keywords = await readKeywordsFromFile();

    if (keywords.length === 0) {
      console.log('[LocalKeywords] No keywords found in file');
      return null;
    }

    // Filter for pending keywords (created = 0)
    const pendingKeywords = keywords.filter(kw => kw.created === 0);

    // Check if all keywords are processed
    if (pendingKeywords.length === 0) {
      console.log('[LocalKeywords] All keywords have been processed. Consider resetting.');
      return null;
    }

    // Sort by root-num to prioritize least queried keywords
    pendingKeywords.sort((a, b) => a.rootNum - b.rootNum);

    // Take 1-2 keywords (whichever is available, max 2)
    const selectedCount = Math.min(pendingKeywords.length, 2);
    const selectedKeywords = pendingKeywords.slice(0, selectedCount);

    return {
      keywords: selectedKeywords.map(kw => kw.keyword),
      ids: selectedKeywords.map(kw => kw.index),
      count: selectedCount,
    };
  } catch (error) {
    console.error('[LocalKeywords] Error fetching keywords:', error);
    throw error;
  }
}

/**
 * Mark keywords as processed by updating their created field to 1
 */
export async function markKeywordsAsProcessed(ids: number[]): Promise<void> {
  try {
    let keywords = await readKeywordsFromFile();

    if (keywords.length === 0) {
      console.log('[LocalKeywords] No keywords to update');
      return;
    }

    // Update the created field for specified IDs
    keywords = keywords.map(kw =>
      ids.includes(kw.index) ? { ...kw, created: 1 } : kw
    );

    // Write back to file
    await writeKeywordsToFile(keywords);

    console.log(`[LocalKeywords] Successfully marked ${ids.length} keyword(s) as processed`);
  } catch (error) {
    console.error('[LocalKeywords] Error updating keywords:', error);
    throw error;
  }
}

/**
 * Check if all keywords are processed (created = 1)
 */
export async function areAllKeywordsProcessed(): Promise<boolean> {
  try {
    const keywords = await readKeywordsFromFile();

    if (keywords.length === 0) {
      return false;
    }

    const pendingKeywords = keywords.filter(kw => kw.created === 0);
    return pendingKeywords.length === 0 && keywords.length > 0;
  } catch (error) {
    console.error('[LocalKeywords] Error checking keyword status:', error);
    throw error;
  }
}

/**
 * Reset all keywords to unprocessed (created = 0)
 */
export async function resetAllKeywords(): Promise<void> {
  try {
    let keywords = await readKeywordsFromFile();

    if (keywords.length === 0) {
      console.log('[LocalKeywords] No keywords to reset');
      return;
    }

    // Reset all created fields to 0
    keywords = keywords.map(kw => ({ ...kw, created: 0 }));

    // Write back to file
    await writeKeywordsToFile(keywords);

    console.log(`[LocalKeywords] Successfully reset all ${keywords.length} keyword(s) to unprocessed`);
  } catch (error) {
    console.error('[LocalKeywords] Error resetting keywords:', error);
    throw error;
  }
}
