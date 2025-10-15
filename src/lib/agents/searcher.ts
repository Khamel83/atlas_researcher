import axios from 'axios';
import { OpenRouterClient } from '../openrouter';
import { modelRouter } from '../models';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  source: 'tavily' | 'perplexity';
}

export interface SearchResults {
  subtopic: string;
  results: SearchResult[];
  searchQuery: string;
}

export class SearcherAgent {
  private client: OpenRouterClient;

  constructor(client: OpenRouterClient) {
    this.client = client;
  }

  async searchSubtopic(subtopic: string, originalQuery?: string): Promise<SearchResults> {
    const searchQuery = this.generateSearchQuery(subtopic, originalQuery);

    try {
      // Try Tavily search first (real web search)
      const results = await this.tavilySearch(searchQuery);
      if (results.length > 0) {
        return {
          subtopic,
          results: results.slice(0, 5), // Top 5 results
          searchQuery
        };
      }
    } catch (error) {
      console.warn('Tavily search failed, trying backup API:', error);
    }

    try {
      // Try backup Tavily API key
      const results = await this.tavilySearchBackup(searchQuery);
      if (results.length > 0) {
        return {
          subtopic,
          results: results.slice(0, 5),
          searchQuery
        };
      }
    } catch (error) {
      console.warn('Backup Tavily API failed, trying Perplexity:', error);
    }

    try {
      // Try Perplexity as fallback
      const results = await this.perplexitySearch(searchQuery);
      if (results.length > 0) {
        return {
          subtopic,
          results: results.slice(0, 5),
          searchQuery
        };
      }
    } catch (error) {
      console.warn('Perplexity search failed:', error);
    }

    // FAKE SEARCH DISABLED - Would rather break than return fake results
    // throw new Error(`All search APIs failed for query: ${searchQuery}`);

    // FAKE SEARCH DISABLED - Rather break than return fake results
    // For now, throw an error so we know real search isn't working
    throw new Error(`All search APIs failed for query: ${searchQuery}. Real search is needed - fake search disabled.`);
  }

  private generateSearchQuery(subtopic: string, originalQuery?: string): string {
    // Create a focused search query from the subtopic
    let query = subtopic;

    // Remove common words and focus on key terms
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about'];
    const words = query.toLowerCase().split(/\s+/).filter(word =>
      word.length > 2 && !stopWords.includes(word)
    );

    // Add quotes around key phrases for better search
    if (words.length > 3) {
      query = `"${words.slice(0, 3).join(' ')}" ${words.slice(3).join(' ')}`;
    }

    // Add year constraint for recent results
    const currentYear = new Date().getFullYear();
    query += ` ${currentYear} OR ${currentYear - 1}`;

    return query;
  }

  // FAKE DUCKDUCKGO SEARCH DISABLED
  // private async duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  //   try {
  //     // Note: DuckDuckGo doesn't have a public API, so we'll simulate this
  //     // In a real implementation, you'd use a service like:
  //     // - Tavily API
  //     // - Serper API
  //     // - Perplexity API

  //     // For now, we'll use a placeholder that could be replaced with actual search API
  //     const response = await axios.get('https://api.duckduckgo.com/', {
  //       params: {
  //         q: query,
  //         format: 'json',
  //         no_html: '1',
  //         skip_disambig: '1'
  //       },
  //       timeout: 10000
  //     });

  //     // This is a simplified parser - real implementation would be more robust
  //     const results: SearchResult[] = [];

  //     if (response.data.RelatedTopics) {
  //       response.data.RelatedTopics.slice(0, 5).forEach((topic: any) => {
  //         if (topic.FirstURL && topic.Text) {
  //           results.push({
  //             url: topic.FirstURL,
  //             title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
  //             snippet: topic.Text,
  //             source: 'duckduckgo'
  //           });
  //         }
  //       });
  //     }

  //     return results;
  //   } catch (error) {
  //     console.warn('DuckDuckGo search error:', error);
  //     return [];
  //   }
  // }

  // FAKE MODEL-BASED SEARCH DISABLED - This generates fake results!
  // private async modelBasedSearch(subtopic: string, searchQuery: string): Promise<SearchResult[]> {
  //   const model = modelRouter.getModelForTask('summarization');
  //   const fallbackModels = modelRouter.getFallbackModels(model);

  //   const prompt = `You are a research assistant. Generate 5 realistic web search results for the query: "${searchQuery}"

  // Focus on the subtopic: "${subtopic}"

  // For each result, provide:
  // 1. A realistic URL (use real domains like news sites, academic sites, government sites)
  // 2. A descriptive title (20-80 characters)
  // 3. A informative snippet (100-200 characters)

  // Format as JSON:
  // {
  //   "results": [
  //     {
  //       "url": "https://example.com/article",
  //       "title": "Article Title Here",
  //       "snippet": "Brief description of the content..."
  //     }
  //   ]
  // }

  // Make the results diverse and from credible sources. Include a mix of:
  // - News articles
  // - Academic/research papers
  // - Government/official sources
  // - Industry reports
  // - Expert analysis`;

  //   try {
  //     const response = await this.client.chatWithFallback(
  //       {
  //         model,
  //         messages: [
  //           {
  //             role: 'system',
  //             content: 'You are a search engine simulator. Generate realistic, diverse web search results that would help research the given topic.'
  //           },
  //           {
  //             role: 'user',
  //             content: prompt
  //           }
  //         ],
  //         max_tokens: 1500,
  //         temperature: 0.7
  //       },
  //       fallbackModels
  //     );

  //     return this.parseModelSearchResults(response.choices[0].message.content);
  //   } catch (error) {
  //     console.error('Model-based search error:', error);
  //     return this.generateFallbackResults(subtopic, searchQuery);
  //   }
  // }

  // FAKE SEARCH PARSING DISABLED
  // private parseModelSearchResults(content: string): SearchResult[] {
  //   try {
  //     const jsonMatch = content.match(/\{[\s\S]*\}/);
  //     if (!jsonMatch) {
  //       throw new Error('No JSON found in response');
  //     }

  //     const parsed = JSON.parse(jsonMatch[0]);

  //     if (!parsed.results || !Array.isArray(parsed.results)) {
  //       throw new Error('Invalid results format');
  //     }

  //     return parsed.results.map((result: any) => ({
  //       url: result.url || 'https://example.com',
  //       title: result.title || 'Research Result',
  //       snippet: result.snippet || 'No description available',
  //       source: 'model_search' as const
  //     })).slice(0, 5);
  //   } catch (error) {
  //     console.error('Failed to parse model search results:', error);
  //     return [];
  //   }
  // }

  // FAKE FALLBACK RESULTS DISABLED - This generates completely fake URLs
  // private generateFallbackResults(subtopic: string, searchQuery: string): SearchResult[] {
  //   // Generate basic fallback results
  //   const domains = [
  //     'wikipedia.org',
  //     'reuters.com',
  //     'bbc.com',
  //     'nature.com',
  //     'science.org'
  //   ];

  //   return domains.map((domain, index) => ({
  //     url: `https://${domain}/article/${encodeURIComponent(searchQuery.replace(/\s+/g, '-').toLowerCase())}`,
  //     title: `${subtopic} - ${domain.split('.')[0].toUpperCase()}`,
  //     snippet: `Research and analysis about ${subtopic}. Latest information and expert insights.`,
  //     source: 'model_search' as const
  //   }));
  // }

  async searchAllSubtopics(subtopics: string[], originalQuery: string): Promise<SearchResults[]> {
    const results: SearchResults[] = [];

    // Search each subtopic sequentially to avoid rate limiting
    for (const subtopic of subtopics) {
      try {
        const result = await this.searchSubtopic(subtopic, originalQuery);
        results.push(result);

        // Small delay between searches to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to search subtopic: ${subtopic}`, error);
        // Continue with other subtopics even if one fails
        results.push({
          subtopic,
          results: [],
          searchQuery: this.generateSearchQuery(subtopic, originalQuery)
        });
      }
    }

    return results;
  }

  validateSearchResults(results: SearchResults[]): boolean {
    // Check if we have meaningful results
    const totalResults = results.reduce((sum, r) => sum + r.results.length, 0);
    return totalResults >= results.length; // At least one result per subtopic
  }

  // REAL SEARCH API IMPLEMENTATIONS

  private async tavilySearch(query: string): Promise<SearchResult[]> {
    try {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        throw new Error('Tavily API key not configured');
      }

      const response = await axios.post('https://api.tavily.com/search', {
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
        max_results: 5,
        include_domains: [],
        exclude_domains: []
      }, {
        timeout: 15000
      });

      if (response.data.results) {
        return response.data.results.map((result: any) => ({
          url: result.url,
          title: result.title,
          snippet: result.content || result.snippet || 'No description available',
          source: 'tavily' as const
        }));
      }

      return [];
    } catch (error) {
      console.warn('Tavily search error:', error);
      return [];
    }
  }

  private async tavilySearchBackup(query: string): Promise<SearchResult[]> {
    try {
      const apiKey = process.env.TAVILY_API_KEY_BACKUP;
      if (!apiKey) {
        throw new Error('Backup Tavily API key not configured');
      }

      const response = await axios.post('https://api.tavily.com/search', {
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
        max_results: 5,
        include_domains: [],
        exclude_domains: []
      }, {
        timeout: 15000
      });

      if (response.data.results) {
        return response.data.results.map((result: any) => ({
          url: result.url,
          title: result.title,
          snippet: result.content || result.snippet || 'No description available',
          source: 'tavily' as const
        }));
      }

      return [];
    } catch (error) {
      console.warn('Backup Tavily search error:', error);
      return [];
    }
  }

  private async perplexitySearch(query: string): Promise<SearchResult[]> {
    try {
      const apiKey = process.env.PERPLEXITY_API_KEY;
      if (!apiKey) {
        throw new Error('Perplexity API key not configured');
      }

      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful research assistant. Provide factual, up-to-date information and cite your sources.'
          },
          {
            role: 'user',
            content: `Search for information about: ${query}. Provide 5 relevant sources with URLs.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });

      const content = response.data.choices[0]?.message?.content || '';

      // Extract URLs from the response using regex
      const urlRegex = /https?:\/\/[^\s\)]+/g;
      const urls = content.match(urlRegex) || [];

      // Split content into sections and create search results
      const sections = content.split(/\d+\./).filter(s => s.trim());
      const results: SearchResult[] = [];

      sections.slice(0, 5).forEach((section, index) => {
        const lines = section.trim().split('\n');
        const title = lines[0] || `Source ${index + 1}`;
        const snippet = lines.slice(1).join(' ').substring(0, 200);
        const url = urls[index] || 'https://example.com';

        results.push({
          url,
          title: title.replace(/^\d+\.\s*/, ''),
          snippet,
          source: 'perplexity' as const
        });
      });

      return results;
    } catch (error) {
      console.warn('Perplexity search error:', error);
      return [];
    }
  }
}