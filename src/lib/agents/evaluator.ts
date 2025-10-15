import axios from 'axios';
import { OpenRouterClient } from '../openrouter';
import { modelRouter } from '../models';
import { SearchResult, SearchResults } from './searcher';

export interface EvaluatedContent {
  url: string;
  title: string;
  summary: string;
  keyPoints: string[];
  citations: string[];
  relevanceScore: number;
  credibilityScore: number;
  contentText?: string;
}

export interface EvaluationResult {
  subtopic: string;
  evaluatedContent: EvaluatedContent[];
  totalSources: number;
  averageRelevance: number;
  averageCredibility: number;
}

export class EvaluatorAgent {
  private client: OpenRouterClient;
  private researchMode?: 'normal' | 'max';

  constructor(client: OpenRouterClient, researchMode?: 'normal' | 'max') {
    this.client = client;
    this.researchMode = researchMode;
  }

  async evaluateSearchResults(searchResults: SearchResults[]): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];

    for (const searchResult of searchResults) {
      try {
        const evaluationResult = await this.evaluateSubtopic(searchResult);
        results.push(evaluationResult);
      } catch (error) {
        console.error(`Failed to evaluate subtopic: ${searchResult.subtopic}`, error);
        // Continue with other subtopics
        results.push({
          subtopic: searchResult.subtopic,
          evaluatedContent: [],
          totalSources: 0,
          averageRelevance: 0,
          averageCredibility: 0
        });
      }
    }

    return results;
  }

  private async evaluateSubtopic(searchResult: SearchResults): Promise<EvaluationResult> {
    // Apply source limits based on research mode
    const maxSources = this.researchMode === 'max' ? 999 : 10; // 999 means use all available sources
    const limitedResults = maxSources === 999 ? searchResult.results : searchResult.results.slice(0, maxSources);
    const evaluatedContent: EvaluatedContent[] = [];

    // Process sources in batches of 4 for efficiency
    const batchSize = 4;
    for (let i = 0; i < limitedResults.length; i += batchSize) {
      const batch = limitedResults.slice(i, i + batchSize);

      try {
        const batchResults = await this.evaluateBatch(batch, searchResult.subtopic);
        evaluatedContent.push(...batchResults);
      } catch (error) {
        console.error(`Failed to evaluate batch ${i + 1}-${Math.min(i + batchSize, allResults.length)}:`, error);
        // Fallback: evaluate individually for this batch
        for (const result of batch) {
          try {
            const content = await this.fetchAndEvaluateContent(result, searchResult.subtopic);
            evaluatedContent.push(content);
          } catch (individualError) {
            console.error(`Failed to evaluate content from ${result.url}:`, individualError);
            evaluatedContent.push(await this.createFallbackEvaluation(result, searchResult.subtopic));
          }
        }
      }
    }

    const averageRelevance = evaluatedContent.length > 0
      ? evaluatedContent.reduce((sum, c) => sum + c.relevanceScore, 0) / evaluatedContent.length
      : 0;

    const averageCredibility = evaluatedContent.length > 0
      ? evaluatedContent.reduce((sum, c) => sum + c.credibilityScore, 0) / evaluatedContent.length
      : 0;

    return {
      subtopic: searchResult.subtopic,
      evaluatedContent,
      totalSources: evaluatedContent.length,
      averageRelevance,
      averageCredibility
    };
  }

  private async evaluateBatch(
    searchResults: SearchResult[],
    subtopic: string
  ): Promise<EvaluatedContent[]> {
    const model = modelRouter.getModelForTask('reasoning');
    const fallbackModels = modelRouter.getFallbackModels(model);

    // Prepare batch evaluation data
    const sourcesData = await Promise.all(
      searchResults.map(async (result) => {
        let contentText = '';
        try {
          const response = await axios.get(result.url, {
            timeout: 5000, // Reduced timeout for batch processing
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AtlasResearcher/1.0)'
            }
          });
          contentText = response.data
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 1000); // Shorter content for batch
        } catch (error) {
          console.warn(`Failed to fetch content from ${result.url}, using snippet only`);
          contentText = result.snippet;
        }

        return {
          url: result.url,
          title: result.title,
          content: contentText
        };
      })
    );

    const prompt = `Evaluate these sources for research on: "${subtopic}"

${sourcesData.map((source, index) =>
`Source ${index + 1}:
URL: ${source.url}
Title: ${source.title}
Content: ${source.content.substring(0, 800)}
`
).join('\n\n')}

Return a JSON array with evaluations for each source:
[
  {
    "summary": "2-3 sentence summary",
    "keyPoints": ["point 1", "point 2"],
    "citations": ["fact or quote"],
    "relevanceScore": 8,
    "credibilityScore": 7,
    "url": "original_url"
  }
]

Be concise but thorough.`;

    const response = await this.client.chatWithFallback(
      {
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a research analyst. Evaluate multiple sources efficiently and return valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      },
      fallbackModels
    );

    return this.parseBatchResponse(response.choices[0].message.content, searchResults);
  }

  private parseBatchResponse(content: string, originalResults: SearchResult[]): EvaluatedContent[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed.map((item, index) => ({
        url: item.url || originalResults[index].url,
        title: originalResults[index].title,
        summary: item.summary || 'No summary available',
        keyPoints: Array.isArray(item.keyPoints) ? item.keyPoints : [],
        citations: Array.isArray(item.citations) ? item.citations : [],
        relevanceScore: this.validateScore(item.relevanceScore),
        credibilityScore: this.validateScore(item.credibilityScore),
        contentText: originalResults[index].snippet
      }));
    } catch (error) {
      console.error('Failed to parse batch evaluation response:', error);
      throw error;
    }
  }

  private async fetchAndEvaluateContent(
    searchResult: SearchResult,
    subtopic: string
  ): Promise<EvaluatedContent> {
    let contentText = '';

    try {
      // Try to fetch the actual content (in a real app, you'd want to use a more robust web scraper)
      const response = await axios.get(searchResult.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AtlasResearcher/1.0)'
        }
      });

      // Simple text extraction (in production, use a proper HTML parser)
      contentText = response.data
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000); // Limit content length
    } catch (error) {
      console.warn(`Failed to fetch content from ${searchResult.url}, using snippet only`);
      contentText = searchResult.snippet;
    }

    return await this.evaluateWithModel(searchResult, contentText, subtopic);
  }

  private async evaluateWithModel(
    searchResult: SearchResult,
    contentText: string,
    subtopic: string
  ): Promise<EvaluatedContent> {
    const model = modelRouter.getModelForTask('reasoning');
    const fallbackModels = modelRouter.getFallbackModels(model);

    const prompt = `Analyze this content for research on: "${subtopic}"

URL: ${searchResult.url}
Title: ${searchResult.title}
Content: ${contentText.substring(0, 2000)}

Provide a JSON response with:
{
  "summary": "2-3 sentence summary of key information",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "citations": ["specific facts or quotes with attribution"],
  "relevanceScore": 0-10 (how relevant to the subtopic),
  "credibilityScore": 0-10 (based on source quality and information accuracy),
  "reasoning": "brief explanation of scores"
}

Focus on extracting actionable insights and verifiable facts.`;

    try {
      const response = await this.client.chatWithFallback(
        {
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a research analyst specializing in content evaluation and fact extraction. Provide objective, accurate assessments.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        },
        fallbackModels
      );

      return this.parseEvaluationResponse(
        response.choices[0].message.content,
        searchResult,
        contentText
      );
    } catch (error) {
      console.error('Model evaluation error:', error);
      return this.createFallbackEvaluation(searchResult, subtopic);
    }
  }

  private parseEvaluationResponse(
    content: string,
    searchResult: SearchResult,
    contentText: string
  ): EvaluatedContent {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        url: searchResult.url,
        title: searchResult.title,
        summary: parsed.summary || 'No summary available',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        citations: Array.isArray(parsed.citations) ? parsed.citations : [],
        relevanceScore: this.validateScore(parsed.relevanceScore),
        credibilityScore: this.validateScore(parsed.credibilityScore),
        contentText: contentText.substring(0, 1000) // Store truncated version
      };
    } catch (error) {
      console.error('Failed to parse evaluation response:', error);
      return this.createFallbackEvaluation(searchResult, '');
    }
  }

  private async createFallbackEvaluation(
    searchResult: SearchResult,
    subtopic: string
  ): Promise<EvaluatedContent> {
    // Create a basic evaluation from just the search result
    const domainCredibility = this.assessDomainCredibility(searchResult.url);
    const relevanceScore = subtopic ? this.assessRelevanceByKeywords(searchResult.snippet, subtopic) : 5;

    return {
      url: searchResult.url,
      title: searchResult.title,
      summary: searchResult.snippet,
      keyPoints: [searchResult.snippet],
      citations: [`From ${searchResult.title}: "${searchResult.snippet}"`],
      relevanceScore,
      credibilityScore: domainCredibility,
      contentText: searchResult.snippet
    };
  }

  private validateScore(score: any): number {
    const numScore = parseFloat(score);
    if (isNaN(numScore)) return 5;
    return Math.max(0, Math.min(10, numScore));
  }

  private assessDomainCredibility(url: string): number {
    try {
      const domain = new URL(url).hostname.toLowerCase();

      // High credibility domains
      const highCredibility = [
        'nature.com', 'science.org', 'cell.com', 'nejm.org',
        'ieee.org', 'acm.org', 'arxiv.org', 'pubmed.ncbi.nlm.nih.gov',
        'who.int', 'cdc.gov', 'nih.gov', 'gov.uk', 'europa.eu',
        'reuters.com', 'ap.org', 'bbc.com', 'npr.org'
      ];

      // Medium credibility domains
      const mediumCredibility = [
        'wikipedia.org', 'britannica.com', 'economist.com',
        'wsj.com', 'ft.com', 'bloomberg.com', 'harvard.edu',
        'mit.edu', 'stanford.edu', 'ox.ac.uk', 'cam.ac.uk'
      ];

      if (highCredibility.some(d => domain.includes(d))) return 9;
      if (mediumCredibility.some(d => domain.includes(d))) return 7;
      if (domain.includes('.edu') || domain.includes('.gov') || domain.includes('.org')) return 6;
      if (domain.includes('.com')) return 5;

      return 4; // Default for unknown domains
    } catch (error) {
      return 4;
    }
  }

  private assessRelevanceByKeywords(text: string, subtopic: string): number {
    const textLower = text.toLowerCase();
    const subtopicWords = subtopic.toLowerCase().split(/\s+/);

    let matchCount = 0;
    subtopicWords.forEach(word => {
      if (word.length > 2 && textLower.includes(word)) {
        matchCount++;
      }
    });

    const relevanceRatio = matchCount / subtopicWords.length;
    return Math.min(10, Math.max(1, Math.round(relevanceRatio * 10)));
  }

  async filterHighQualityContent(
    evaluationResults: EvaluationResult[],
    minRelevance: number = 5,
    minCredibility: number = 4
  ): Promise<EvaluationResult[]> {
    return evaluationResults.map(result => ({
      ...result,
      evaluatedContent: result.evaluatedContent.filter(
        content => content.relevanceScore >= minRelevance && content.credibilityScore >= minCredibility
      )
    })).filter(result => result.evaluatedContent.length > 0);
  }
}