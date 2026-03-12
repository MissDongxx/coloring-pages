/**
 * Gist Keywords Service
 * Fetches and updates keywords from GitHub Gist (with local file fallback)
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

// Gist configuration
const GIST_ID = process.env.GIST_ID || '';
const GIST_TOKEN = process.env.GIST_COLORING_TOKEN || '';

interface GistFile {
  content?: string;
  filename?: string;
}

interface GistResponse {
  files: Record<string, GistFile>;
}

/**
 * Fetch keywords from Gist
 */
async function fetchKeywordsFromGist(): Promise<Keyword[]> {
  if (!GIST_ID || !GIST_TOKEN) {
    console.log('[GistKeywords] GIST_ID or GIST_COLORING_TOKEN not configured');
    return [];
  }

  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `Bearer ${GIST_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      console.error(`[GistKeywords] Failed to fetch gist: ${response.status}`);
      return [];
    }

    const gist: GistResponse = await response.json();
    const files = gist.files;

    // Look for keywords.csv file
    let csvContent: string | undefined;
    for (const [filename, file] of Object.entries(files)) {
      if (filename.toLowerCase() === 'keywords.csv' && file.content) {
        csvContent = file.content;
        break;
      }
    }

    if (!csvContent) {
      console.log('[GistKeywords] No keywords.csv found in gist');
      return [];
    }

    // Parse CSV content
    const keywords: Keyword[] = [];
    const lines = csvContent.split('\n').filter(line => line.trim());

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

    console.log(`[GistKeywords] Loaded ${keywords.length} keywords from gist`);
    return keywords;

  } catch (error) {
    console.error('[GistKeywords] Error fetching from gist:', error);
    return [];
  }
}

/**
 * Update keywords in Gist
 */
async function updateKeywordsInGist(keywords: Keyword[]): Promise<boolean> {
  if (!GIST_ID || !GIST_TOKEN) {
    console.log('[GistKeywords] GIST_ID or GIST_COLORING_TOKEN not configured');
    return false;
  }

  try {
    // Convert keywords to CSV
    const header = 'root-keyword,root-num,keyword-raw,keyword,index,created';
    const rows = keywords.map(kw =>
      `${kw.rootKeyword},${kw.rootNum},${kw.keywordRaw},${kw.keyword},${kw.index},${kw.created}`
    ).join('\n');
    const csvContent = `${header}\n${rows}`;

    // Fetch current gist to preserve other files
    const getResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `Bearer ${GIST_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!getResponse.ok) {
      console.error(`[GistKeywords] Failed to fetch gist for update: ${getResponse.status}`);
      return false;
    }

    const currentGist: GistResponse = await getResponse.json();

    // Prepare files payload
    const filesPayload: Record<string, { content: string }> = {};

    // Update keywords.csv
    filesPayload['keywords.csv'] = { content: csvContent };

    // Keep other files unchanged (if needed)
    for (const [filename, file] of Object.entries(currentGist.files)) {
      if (filename.toLowerCase() !== 'keywords.csv' && file.content) {
        filesPayload[filename] = { content: file.content };
      }
    }

    // Update gist
    const patchResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${GIST_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: filesPayload,
        description: 'Coloring pages keywords - auto-updated',
      }),
    });

    if (!patchResponse.ok) {
      console.error(`[GistKeywords] Failed to update gist: ${patchResponse.status}`);
      return false;
    }

    console.log(`[GistKeywords] Updated ${keywords.length} keywords in gist`);
    return true;

  } catch (error) {
    console.error('[GistKeywords] Error updating gist:', error);
    return false;
  }
}

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
 * Load keywords (try Gist first, fallback to local file)
 */
async function loadKeywords(): Promise<Keyword[]> {
  // Try Gist first
  if (GIST_ID && GIST_TOKEN) {
    const keywords = await fetchKeywordsFromGist();
    if (keywords.length > 0) {
      // Also save to local file as backup
      await writeKeywordsToFile(keywords);
      return keywords;
    }
  }

  // Fallback to local file
  return await readKeywordsFromFile();
}

/**
 * Get pending keywords (created = 0)
 * Returns 1-2 keywords (whichever is available, max 2)
 */
export async function getPendingKeywords(): Promise<PendingKeywordResult | null> {
  try {
    const keywords = await loadKeywords();

    if (keywords.length === 0) {
      console.log('[GistKeywords] No keywords found');
      return null;
    }

    // Filter for pending keywords (created = 0)
    const pendingKeywords = keywords.filter(kw => kw.created === 0);

    // Check if all keywords are processed
    if (pendingKeywords.length === 0) {
      console.log('[GistKeywords] All keywords have been processed. Consider resetting.');
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
    console.error('[GistKeywords] Error fetching keywords:', error);
    throw error;
  }
}

/**
 * Mark keywords as processed by updating their created field to 1
 */
export async function markKeywordsAsProcessed(ids: number[]): Promise<void> {
  try {
    let keywords = await loadKeywords();

    if (keywords.length === 0) {
      console.log('[GistKeywords] No keywords to update');
      return;
    }

    // Update the created field for specified IDs
    keywords = keywords.map(kw =>
      ids.includes(kw.index) ? { ...kw, created: 1 } : kw
    );

    // Save to both local file and gist
    await writeKeywordsToFile(keywords);

    if (GIST_ID && GIST_TOKEN) {
      const gistSuccess = await updateKeywordsInGist(keywords);
      if (gistSuccess) {
        console.log(`[GistKeywords] Successfully synced to Gist`);
      } else {
        console.log(`[GistKeywords] Failed to sync to Gist (local file updated)`);
      }
    }

    console.log(`[GistKeywords] Successfully marked ${ids.length} keyword(s) as processed`);
  } catch (error) {
    console.error('[GistKeywords] Error updating keywords:', error);
    throw error;
  }
}

/**
 * Check if all keywords are processed (created = 1)
 */
export async function areAllKeywordsProcessed(): Promise<boolean> {
  try {
    const keywords = await loadKeywords();

    if (keywords.length === 0) {
      return false;
    }

    const pendingKeywords = keywords.filter(kw => kw.created === 0);
    return pendingKeywords.length === 0 && keywords.length > 0;
  } catch (error) {
    console.error('[GistKeywords] Error checking keyword status:', error);
    throw error;
  }
}

/**
 * Reset all keywords to unprocessed (created = 0)
 */
export async function resetAllKeywords(): Promise<void> {
  try {
    let keywords = await loadKeywords();

    if (keywords.length === 0) {
      console.log('[GistKeywords] No keywords to reset');
      return;
    }

    // Reset all created fields to 0
    keywords = keywords.map(kw => ({ ...kw, created: 0 }));

    // Save to both local file and gist
    await writeKeywordsToFile(keywords);

    if (GIST_ID && GIST_TOKEN) {
      const gistSuccess = await updateKeywordsInGist(keywords);
      if (gistSuccess) {
        console.log(`[GistKeywords] Successfully synced to Gist`);
      } else {
        console.log(`[GistKeywords] Failed to sync to Gist (local file updated)`);
      }
    }

    console.log(`[GistKeywords] Successfully reset all ${keywords.length} keyword(s) to unprocessed`);
  } catch (error) {
    console.error('[GistKeywords] Error resetting keywords:', error);
    throw error;
  }
}
