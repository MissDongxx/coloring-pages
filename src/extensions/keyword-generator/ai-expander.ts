/**
 * AI Keyword Expander
 * 使用AI生成高质量的关键词变体
 */

export interface KeywordExpansionOptions {
  /** 基础关键词 */
  keyword: string;
  /** 目标数量 */
  count?: number;
  /** 类别（用于生成相关变体） */
  category?: string;
}

export interface ExpandedKeyword {
  /** 关键词 */
  keyword: string;
  /** 变体类型 */
  type: 'base' | 'style' | 'scene' | 'action' | 'detail';
  /** 原始根词 */
  root: string;
}

export interface AIExpanderResult {
  /** 生成的关键词列表 */
  keywords: ExpandedKeyword[];
  /** 使用的模型 */
  model: string;
}

/**
 * AI关键词扩展器
 */
export class AIKeywordExpander {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DEEPSEEK_API || '';
    this.baseURL = 'https://api.deepseek.com/v1';
    this.model = 'deepseek-chat';
  }

  /**
   * 生成关键词扩展的prompt
   */
  private buildPrompt(options: KeywordExpansionOptions): string {
    const { keyword, count = 20, category = 'general' } = options;

    return `You are a senior Pinterest operations and SEO expert specializing in coloring page content.

Your task: Generate ${count} diverse coloring page scenarios based on "${keyword}" (category: ${category}).

**Requirements:**

1. **Scene Diversity**: Generate different SCENES and SITUATIONS related to "${keyword}":
   - Activities: what characters/objects are DOING
   - Locations: where the scene takes place
   - Interactions: between characters/objects
   - Moments: special occasions or everyday situations
   - Perspectives: close-up, wide view, action, still life

2. **Quality Control**:
   - Each keyword should represent a complete, unique scene
   - Avoid contradictions
   - Ensure keywords are search-friendly and natural
   - Keywords must be in English

**Output Format:**
Return ONLY a valid JSON array of keyword strings. No explanations, no markdown formatting.

**Examples:**
For "christmas":
[
  "santa claus delivering gifts down chimney",
  "children decorating christmas tree together",
  "family opening presents around tree",
  "baking christmas cookies in kitchen",
  "writing letters to santa by fireplace"
]

Generate ${count} unique scene-based keyword variations now:`;
  }

  /**
   * 解析AI响应
   */
  private parseResponse(content: string, rootKeyword: string): ExpandedKeyword[] {
    try {
      // 清理可能的markdown格式
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed.map((item: any) => {
        // 支持字符串数组或对象数组
        const keyword = typeof item === 'string' ? item : (item.keyword || item);
        return {
          keyword,
          type: this.detectType(keyword),
          root: rootKeyword,
        };
      });
    } catch (error) {
      console.error('Failed to parse AI response:', content);
      throw new Error(`Invalid AI response format: ${error}`);
    }
  }

  /**
   * 检测关键词类型
   */
  private detectType(keyword: string): ExpandedKeyword['type'] {
    const lower = keyword.toLowerCase();

    if (lower.includes(' for ') || lower.includes('cute') || lower.includes('cartoon') ||
      lower.includes('realistic') || lower.includes('simple') || lower.includes('detailed') ||
      lower.includes('intricate') || lower.includes('kawaii') || lower.includes('vintage') ||
      lower.includes('elegant') || lower.includes('easy') || lower.includes('beginner')) {
      return 'style';
    }
    if (lower.includes(' in ') || lower.includes(' on ') || lower.includes(' at ') || lower.includes(' under')) {
      return 'scene';
    }
    if (lower.match(/\b(sitting|standing|flying|running|sleeping|playing|jumping|dancing|walking|eating)\b/)) {
      return 'action';
    }
    if (lower.includes('christmas') || lower.includes('halloween') || lower.includes('easter') ||
      lower.includes('spring') || lower.includes('summer') || lower.includes('winter') || lower.includes('fall')) {
      return 'detail';
    }

    return 'base';
  }

  /**
   * 扩展关键词
   */
  async expand(options: KeywordExpansionOptions): Promise<AIExpanderResult> {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API is not configured');
    }

    const prompt = this.buildPrompt(options);

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a JSON-only API. Always respond with valid JSON arrays, never with explanations or markdown.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from DeepSeek');
      }

      const keywords = this.parseResponse(content, options.keyword);

      return {
        keywords,
        model: this.model,
      };
    } catch (error: any) {
      console.error('AI keyword expansion failed:', error);
      throw error;
    }
  }

  /**
   * 批量扩展多个关键词
   */
  async expandBatch(
    keywords: string[],
    options: Omit<KeywordExpansionOptions, 'keyword'> & { perKeyword?: number } = {}
  ): Promise<Map<string, ExpandedKeyword[]>> {
    const perKeyword = options.perKeyword || 10;
    const results = new Map<string, ExpandedKeyword[]>();

    for (const keyword of keywords) {
      try {
        const result = await this.expand({
          keyword,
          count: perKeyword,
          ...options,
        });
        results.set(keyword, result.keywords);
      } catch (error) {
        console.error(`Failed to expand keyword "${keyword}":`, error);
        results.set(keyword, []);
      }
    }

    return results;
  }
}

/**
 * 创建AI关键词扩展器实例
 */
export function createAIKeywordExpander(apiKey?: string): AIKeywordExpander {
  return new AIKeywordExpander(apiKey);
}
