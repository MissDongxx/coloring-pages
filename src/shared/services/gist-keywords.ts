/**
 * Gist Keywords Service
 * Fetches and updates keywords from a GitHub Gist
 */

interface GistKeywordRow {
  'root-keyword': string;
  'root-num': string;
  'keyword-raw': string;
  'keyword': string;
  'index': string;
  'created': string;
}

interface GistKeyword {
  rootKeyword: string;
  rootNum: number;
  keywordRaw: string;
  keyword: string;
  index: number;
  created: number;
}

interface GistResponse {
  files: {
    [filename: string]: {
      content: string;
      raw_url: string;
    };
  };
}

interface GistUpdateRequest {
  files: {
    [filename: string]: {
      content: string;
    };
  };
}

export interface PendingKeywordResult {
  keywords: string[];  // Array of root keywords to process
  ids: number[];       // Array of indices for updating
  count: number;       // Number of keywords found (1 or 2)
}

const GIST_API_URL = 'https://api.github.com/gists/b34e03eecb67ee83475f108117b1858d';
const GIST_KEYWORDS_FILENAME = 'keywords';

// Cache for the raw URL to avoid frequent API calls
let cachedKeywordsUrl: string | null = null;
let urlCacheTime = 0;
const URL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the current raw URL for the keywords file
 */
async function getKeywordsUrl(token: string): Promise<string> {
  const now = Date.now();

  // Return cached URL if still valid
  if (cachedKeywordsUrl && (now - urlCacheTime) < URL_CACHE_TTL) {
    return cachedKeywordsUrl;
  }

  // Fetch latest from API
  const response = await fetch(GIST_API_URL, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Gist metadata: ${response.status} ${response.statusText}`);
  }

  const gistData: GistResponse = await response.json();
  const keywordsFile = gistData.files[GIST_KEYWORDS_FILENAME];

  if (!keywordsFile || !keywordsFile.raw_url) {
    throw new Error(`Keywords file not found in Gist`);
  }

  // Update cache
  cachedKeywordsUrl = keywordsFile.raw_url;
  urlCacheTime = now;

  return cachedKeywordsUrl;
}

/**
 * Parse Gist content into keyword array
 * Expects standard CSV format: root-keyword,root-num,keyword-raw,keyword,index,created
 */
function parseGistContent(content: string): GistKeyword[] {
  const lines = content.split('\n').filter(line => line.trim());
  const keywords: GistKeyword[] = [];

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
 * Convert keywords array back to CSV format
 */
function formatGistContent(keywords: GistKeyword[]): string {
  const header = 'root-keyword,root-num,keyword-raw,keyword,index,created';
  const rows = keywords.map(kw =>
    `${kw.rootKeyword},${kw.rootNum},${kw.keywordRaw},${kw.keyword},${kw.index},${kw.created}`
  ).join('\n');

  return `${header}\n${rows}`;
}

/**
 * Get pending keywords from Gist (created = 0)
 * Returns 1-2 keywords (whichever is available, max 2)
 */
export async function getPendingKeywords(): Promise<PendingKeywordResult | null> {
  const token = process.env.GIST_COLORING_TOKEN || process.env.Gist_Coloring;

  if (!token) {
    throw new Error('GIST_COLORING_TOKEN environment variable is not set');
  }

  try {
    // Fetch Gist content
    const keywordsUrl = await getKeywordsUrl(token);
    const response = await fetch(keywordsUrl, {
      headers: {
        'Authorization': `token ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Gist: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    const keywords = parseGistContent(content);

    // Filter for pending keywords (created = 0)
    const pendingKeywords = keywords.filter(kw => kw.created === 0);

    // Check if all keywords are processed
    if (pendingKeywords.length === 0 && keywords.length > 0) {
      console.log('[GistKeywords] All keywords have been processed. Consider resetting.');
      return null;
    }

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
  const token = process.env.GIST_COLORING_TOKEN || process.env.Gist_Coloring;

  if (!token) {
    throw new Error('GIST_COLORING_TOKEN environment variable is not set');
  }

  try {
    // First fetch current content
    const keywordsUrl = await getKeywordsUrl(token);
    const fetchResponse = await fetch(keywordsUrl, {
      headers: {
        'Authorization': `token ${token}`,
      },
      cache: 'no-store',
    });

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch Gist: ${fetchResponse.status} ${fetchResponse.statusText}`);
    }

    const content = await fetchResponse.text();
    let keywords = parseGistContent(content);

    // Update the created field for specified IDs
    keywords = keywords.map(kw =>
      ids.includes(kw.index) ? { ...kw, created: 1 } : kw
    );

    // Format back to Gist content
    const newContent = formatGistContent(keywords);

    // Update Gist using the known filename
    const updateResponse = await fetch(GIST_API_URL, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          [GIST_KEYWORDS_FILENAME]: {
            content: newContent,
          },
        },
      } as GistUpdateRequest),
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update Gist: ${updateResponse.status} ${updateResponse.statusText}`);
    }

    // Clear URL cache since the raw URL has changed
    cachedKeywordsUrl = null;
    urlCacheTime = 0;

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
  const token = process.env.GIST_COLORING_TOKEN || process.env.Gist_Coloring;

  if (!token) {
    throw new Error('GIST_COLORING_TOKEN environment variable is not set');
  }

  try {
    const keywordsUrl = await getKeywordsUrl(token);
    const response = await fetch(keywordsUrl, {
      headers: {
        'Authorization': `token ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Gist: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    const keywords = parseGistContent(content);

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
  const token = process.env.GIST_COLORING_TOKEN || process.env.Gist_Coloring;

  if (!token) {
    throw new Error('GIST_COLORING_TOKEN environment variable is not set');
  }

  try {
    // First fetch current content
    const keywordsUrl = await getKeywordsUrl(token);
    const fetchResponse = await fetch(keywordsUrl, {
      headers: {
        'Authorization': `token ${token}`,
      },
      cache: 'no-store',
    });

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch Gist: ${fetchResponse.status} ${fetchResponse.statusText}`);
    }

    const content = await fetchResponse.text();
    let keywords = parseGistContent(content);

    // Reset all created fields to 0
    keywords = keywords.map(kw => ({ ...kw, created: 0 }));

    // Format back to Gist content
    const newContent = formatGistContent(keywords);

    // Update Gist using the known filename
    const updateResponse = await fetch(GIST_API_URL, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          [GIST_KEYWORDS_FILENAME]: {
            content: newContent,
          },
        },
      } as GistUpdateRequest),
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update Gist: ${updateResponse.status} ${updateResponse.statusText}`);
    }

    // Clear URL cache since the raw URL has changed
    cachedKeywordsUrl = null;
    urlCacheTime = 0;

    console.log(`[GistKeywords] Successfully reset all ${keywords.length} keyword(s) to unprocessed`);
  } catch (error) {
    console.error('[GistKeywords] Error resetting keywords:', error);
    throw error;
  }
}
