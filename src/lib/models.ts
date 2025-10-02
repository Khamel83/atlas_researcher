export const MODEL_STRATEGY = {
  planning: 'mistralai/mistral-7b-instruct:free',
  reasoning: 'deepseek/deepseek-r1:free',
  summarization: 'mistralai/mistral-7b-instruct:free',
  synthesis: 'meta-llama/llama-3-70b-instruct:free',
  fallback: 'openrouter/auto'
} as const;

export const FALLBACK_MODELS = [
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3-8b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'openrouter/auto'
];

export type ModelTask = keyof typeof MODEL_STRATEGY;

export interface ModelUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class ModelRouter {
  getModelForTask(task: ModelTask): string {
    return MODEL_STRATEGY[task];
  }

  getFallbackModels(primaryModel?: string): string[] {
    return FALLBACK_MODELS.filter(model => model !== primaryModel);
  }

  createModelUsageTracker() {
    const usage: ModelUsage[] = [];

    const trackUsage = (model: string, promptTokens: number, completionTokens: number) => {
      usage.push({
        model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      });
    };

    const getTotalUsage = () => {
      return {
        totalTokens: usage.reduce((sum, u) => sum + u.totalTokens, 0),
        totalPromptTokens: usage.reduce((sum, u) => sum + u.promptTokens, 0),
        totalCompletionTokens: usage.reduce((sum, u) => sum + u.completionTokens, 0),
        modelsUsed: [...new Set(usage.map(u => u.model))],
        detailedUsage: usage
      };
    };

    const getUsageByModel = () => {
      const byModel: Record<string, { tokens: number; calls: number }> = {};

      usage.forEach(u => {
        if (!byModel[u.model]) {
          byModel[u.model] = { tokens: 0, calls: 0 };
        }
        byModel[u.model].tokens += u.totalTokens;
        byModel[u.model].calls += 1;
      });

      return byModel;
    };

    return {
      trackUsage,
      getTotalUsage,
      getUsageByModel,
      usage
    };
  }
}

export const modelRouter = new ModelRouter();