export const MODEL_STRATEGY = {
  planning: 'google/gemini-2.5-flash-preview-09-2025',
  reasoning: 'google/gemini-2.5-flash-preview-09-2025',
  summarization: 'google/gemini-2.5-flash-preview-09-2025',
  synthesis: 'google/gemini-2.5-flash-preview-09-2025',
  fallback: 'google/gemini-2.5-flash-lite-preview-09-2025'
} as const;

export const FALLBACK_MODELS = [
  'google/gemini-2.5-flash-lite-preview-09-2025',
  'meta-llama/llama-3.1-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemini-2.0-flash-001'
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