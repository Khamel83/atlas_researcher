import { OpenRouterClient } from '../openrouter';
import { modelRouter } from '../models';

export interface PlanningResult {
  subtopics: string[];
  originalQuery: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export class PlannerAgent {
  private client: OpenRouterClient;

  constructor(client: OpenRouterClient) {
    this.client = client;
  }

  async planResearch(query: string): Promise<PlanningResult> {
    const model = modelRouter.getModelForTask('planning');
    const fallbackModels = modelRouter.getFallbackModels(model);

    const prompt = this.createPlanningPrompt(query);

    try {
      const response = await this.client.chatWithFallback(
        {
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a research planning specialist. Your job is to break down complex research questions into specific, actionable subtopics that can be investigated independently.'
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

      return this.parseResponse(response.choices[0].message.content, query);
    } catch (error) {
      console.error('Planner agent error:', error);
      // Fallback to a simple topic breakdown
      return this.createFallbackPlan(query);
    }
  }

  private createPlanningPrompt(query: string): string {
    return `Break down this research question into 5-7 specific subtopics that should be investigated to provide a comprehensive answer.

Research Question: "${query}"

Requirements:
1. Each subtopic should be specific and focused
2. Subtopics should cover different aspects/angles of the main question
3. They should be researchable using web search
4. Avoid overlap between subtopics
5. Include both current state and future trends where relevant

Format your response as a JSON object with this structure:
{
  "subtopics": ["subtopic 1", "subtopic 2", ...],
  "complexity": "low|medium|high",
  "reasoning": "brief explanation of your approach"
}

Focus only on the subtopics that will lead to the most informative and comprehensive research.`;
  }

  private parseResponse(content: string, originalQuery: string): PlanningResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.subtopics || !Array.isArray(parsed.subtopics)) {
        throw new Error('Invalid subtopics format');
      }

      return {
        subtopics: parsed.subtopics.slice(0, 7), // Ensure max 7 subtopics
        originalQuery,
        estimatedComplexity: this.validateComplexity(parsed.complexity) || 'medium'
      };
    } catch (error) {
      console.error('Failed to parse planner response:', error);
      return this.createFallbackPlan(originalQuery);
    }
  }

  private validateComplexity(complexity: string): 'low' | 'medium' | 'high' | null {
    const validValues = ['low', 'medium', 'high'];
    return validValues.includes(complexity) ? complexity as 'low' | 'medium' | 'high' : null;
  }

  private createFallbackPlan(query: string): PlanningResult {
    // Simple keyword-based fallback
    const words = query.toLowerCase().split(/\s+/);
    const keyWords = words.filter(word => word.length > 3);

    const subtopics = [
      `Current state of ${keyWords[0] || 'the topic'}`,
      `Historical background and context`,
      `Key challenges and problems`,
      `Recent developments and trends`,
      `Future outlook and predictions`,
      `Expert opinions and analysis`
    ].slice(0, Math.min(6, keyWords.length + 2));

    return {
      subtopics,
      originalQuery: query,
      estimatedComplexity: 'medium'
    };
  }

  async validatePlan(plan: PlanningResult): Promise<boolean> {
    // Basic validation
    if (plan.subtopics.length < 3 || plan.subtopics.length > 7) {
      return false;
    }

    // Check for overly similar subtopics
    const uniqueWords = new Set();
    plan.subtopics.forEach(subtopic => {
      const words = subtopic.toLowerCase().split(/\s+/);
      words.forEach(word => uniqueWords.add(word));
    });

    // If there's too much word overlap, the plan might be too repetitive
    const avgWordsPerSubtopic = plan.subtopics.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / plan.subtopics.length;
    const uniquenessRatio = uniqueWords.size / (plan.subtopics.length * avgWordsPerSubtopic);

    return uniquenessRatio > 0.6; // At least 60% unique words
  }
}