import axios from 'axios';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export class OpenRouterClient {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseURL = OPENROUTER_BASE;
  }

  async chat(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          ...request,
          max_tokens: request.max_tokens || 4000,
          temperature: request.temperature || 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://ar.khamel.com',
            'X-Title': 'Atlas Researcher',
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutes
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;

        if (status === 429) {
          throw new Error(`Rate limit exceeded: ${message}`);
        } else if (status === 401) {
          throw new Error('Invalid API key');
        } else if (status === 402) {
          throw new Error('Insufficient credits');
        } else {
          throw new Error(`OpenRouter API error: ${message}`);
        }
      }
      throw error;
    }
  }

  async chatWithFallback(
    request: OpenRouterRequest,
    fallbackModels: string[] = []
  ): Promise<OpenRouterResponse> {
    const models = [request.model, ...fallbackModels];

    for (let i = 0; i < models.length; i++) {
      try {
        const modelRequest = { ...request, model: models[i] };
        return await this.chat(modelRequest);
      } catch (error: any) {
        // If it's a rate limit error and we have fallback models, try the next one
        if (error.message.includes('Rate limit exceeded') && i < models.length - 1) {
          console.warn(`Model ${models[i]} rate limited, trying fallback: ${models[i + 1]}`);
          continue;
        }
        // If it's the last model or a different error, throw
        throw error;
      }
    }

    throw new Error('All models failed');
  }
}

export const createOpenRouterClient = (apiKey: string) => {
  return new OpenRouterClient(apiKey);
};