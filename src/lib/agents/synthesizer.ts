import { OpenRouterClient } from '../openrouter';
import { modelRouter } from '../models';
import { EvaluationResult } from './evaluator';
import { PlanningResult } from './planner';

export interface SynthesisResult {
  fullReport: string;
  wordCount: number;
  sectionsGenerated: string[];
  keyFindings: string[];
  citationsUsed: number;
  modelUsed: string;
}

export class SynthesizerAgent {
  private client: OpenRouterClient;

  constructor(client: OpenRouterClient) {
    this.client = client;
  }

  async synthesizeReport(
    originalQuery: string,
    planningResult: PlanningResult,
    evaluationResults: EvaluationResult[]
  ): Promise<SynthesisResult> {
    const model = modelRouter.getModelForTask('synthesis');
    const fallbackModels = modelRouter.getFallbackModels(model);

    try {
      // Generate the main report
      const reportContent = await this.generateMainReport(
        originalQuery,
        planningResult,
        evaluationResults,
        model,
        fallbackModels
      );

      // Extract metadata
      const wordCount = this.countWords(reportContent);
      const sectionsGenerated = this.extractSections(reportContent);
      const keyFindings = this.extractKeyFindings(reportContent);
      const citationsUsed = this.countCitations(reportContent);

      return {
        fullReport: reportContent,
        wordCount,
        sectionsGenerated,
        keyFindings,
        citationsUsed,
        modelUsed: model
      };
    } catch (error) {
      console.error('Synthesis error:', error);
      return this.generateFallbackReport(originalQuery, planningResult, evaluationResults);
    }
  }

  private async generateMainReport(
    originalQuery: string,
    planningResult: PlanningResult,
    evaluationResults: EvaluationResult[],
    model: string,
    fallbackModels: string[]
  ): Promise<string> {
    const prompt = this.createSynthesisPrompt(originalQuery, planningResult, evaluationResults);

    const response = await this.client.chatWithFallback(
      {
        model,
        messages: [
          {
            role: 'system',
            content: `You are an expert research analyst and technical writer. Create comprehensive, well-structured research reports using markdown format.

            Follow these guidelines:
            - Use clear, professional language
            - Include proper citations [1], [2], etc.
            - Structure with appropriate headings
            - Provide actionable insights
            - Be objective and evidence-based
            - Include a strong conclusion with key takeaways`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.4
      },
      fallbackModels
    );

    return this.postProcessReport(response.choices[0].message.content, evaluationResults);
  }

  private createSynthesisPrompt(
    originalQuery: string,
    planningResult: PlanningResult,
    evaluationResults: EvaluationResult[]
  ): string {
    const researchData = this.formatResearchData(evaluationResults);

    return `Create a comprehensive research report answering: "${originalQuery}"

**Research Scope:**
Complexity: ${planningResult.estimatedComplexity}
Subtopics investigated: ${planningResult.subtopics.join(', ')}

**Research Data:**
${researchData}

**Report Requirements:**
1. **Executive Summary** (2-3 paragraphs)
2. **Introduction** - Context and importance of the topic
3. **Main Analysis** - One section per major subtopic with:
   - Key findings and evidence
   - Supporting data and statistics
   - Expert opinions where available
   - Current trends and developments
4. **Key Insights** - 3-5 bullet points of main discoveries
5. **Future Outlook** - Predictions and implications
6. **Conclusion** - Synthesis of findings and recommendations
7. **Sources** - Numbered citations list

**Style Guidelines:**
- Use markdown formatting with proper headings (##, ###)
- Include in-text citations as [1], [2], etc.
- Aim for 1500-2500 words
- Be analytical, not just descriptive
- Support claims with evidence from sources
- Use bullet points and lists for clarity

Create a report that thoroughly answers the original question with evidence-based insights.`;
  }

  private formatResearchData(evaluationResults: EvaluationResult[]): string {
    let formattedData = '';

    evaluationResults.forEach((result, index) => {
      formattedData += `\n**${result.subtopic}:**\n`;

      result.evaluatedContent.forEach((content, contentIndex) => {
        const citationNumber = (index * 10) + contentIndex + 1;

        formattedData += `[${citationNumber}] ${content.title}\n`;
        formattedData += `Summary: ${content.summary}\n`;

        if (content.keyPoints.length > 0) {
          formattedData += `Key Points: ${content.keyPoints.join('; ')}\n`;
        }

        if (content.citations.length > 0) {
          formattedData += `Notable Citations: ${content.citations.join('; ')}\n`;
        }

        formattedData += `Relevance: ${content.relevanceScore}/10, Credibility: ${content.credibilityScore}/10\n`;
        formattedData += `Source: ${content.url}\n\n`;
      });
    });

    return formattedData;
  }

  private postProcessReport(content: string, evaluationResults: EvaluationResult[]): string {
    let processedContent = content;

    // Ensure proper markdown formatting
    if (!processedContent.includes('# ')) {
      processedContent = `# Research Report\n\n${processedContent}`;
    }

    // Add sources section if not present
    if (!processedContent.toLowerCase().includes('sources') && !processedContent.toLowerCase().includes('references')) {
      const sourcesSection = this.generateSourcesSection(evaluationResults);
      processedContent += `\n\n## Sources\n\n${sourcesSection}`;
    }

    // Add metadata footer
    const timestamp = new Date().toISOString().split('T')[0];
    processedContent += `\n\n---\n\n*Report generated on ${timestamp} by Atlas Researcher*\n`;
    processedContent += `*Research methodology: Multi-agent analysis with ${evaluationResults.length} subtopics investigated*`;

    return processedContent;
  }

  private generateSourcesSection(evaluationResults: EvaluationResult[]): string {
    let sources = '';
    let citationNumber = 1;

    evaluationResults.forEach(result => {
      result.evaluatedContent.forEach(content => {
        sources += `[${citationNumber}] ${content.title}. ${content.url}\n\n`;
        citationNumber++;
      });
    });

    return sources || '[1] Research compiled from multiple sources via Atlas Researcher\n\n';
  }

  private generateFallbackReport(
    originalQuery: string,
    planningResult: PlanningResult,
    evaluationResults: EvaluationResult[]
  ): SynthesisResult {
    const fallbackContent = `# Research Report: ${originalQuery}

## Executive Summary

This report presents findings from a comprehensive research investigation into "${originalQuery}". The research was conducted across ${planningResult.subtopics.length} key areas to provide a thorough analysis.

## Introduction

${originalQuery} represents an important topic that requires careful examination across multiple dimensions. This research aimed to provide evidence-based insights through systematic analysis.

## Key Areas Investigated

${planningResult.subtopics.map((subtopic, index) => `${index + 1}. ${subtopic}`).join('\n')}

## Main Findings

${evaluationResults.map(result => {
  if (result.evaluatedContent.length === 0) return '';

  return `### ${result.subtopic}

${result.evaluatedContent.map(content => `- ${content.summary}`).join('\n')}`;
}).filter(section => section).join('\n\n')}

## Conclusion

Based on the research conducted across ${evaluationResults.length} key areas, this analysis provides foundational insights into ${originalQuery}. Further research may be beneficial to explore specific aspects in greater detail.

## Sources

${evaluationResults.flatMap(result =>
  result.evaluatedContent.map((content, index) => `[${index + 1}] ${content.title}. ${content.url}`)
).join('\n')}

---

*Report generated by Atlas Researcher*`;

    return {
      fullReport: fallbackContent,
      wordCount: this.countWords(fallbackContent),
      sectionsGenerated: ['Executive Summary', 'Introduction', 'Main Findings', 'Conclusion', 'Sources'],
      keyFindings: ['Analysis completed across multiple research areas'],
      citationsUsed: evaluationResults.reduce((sum, result) => sum + result.evaluatedContent.length, 0),
      modelUsed: 'fallback'
    };
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractSections(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('##') && !trimmed.startsWith('###')) {
        const sectionName = trimmed.replace(/^#+\s*/, '').trim();
        if (sectionName) {
          sections.push(sectionName);
        }
      }
    });

    return sections;
  }

  private extractKeyFindings(content: string): string[] {
    const findings: string[] = [];
    const lines = content.split('\n');
    let inKeySection = false;

    lines.forEach(line => {
      const trimmed = line.trim();

      if (trimmed.toLowerCase().includes('key insights') ||
          trimmed.toLowerCase().includes('main findings') ||
          trimmed.toLowerCase().includes('key findings')) {
        inKeySection = true;
        return;
      }

      if (inKeySection && trimmed.startsWith('##')) {
        inKeySection = false;
        return;
      }

      if (inKeySection && (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed))) {
        const finding = trimmed.replace(/^[-*\d.]\s*/, '').trim();
        if (finding) {
          findings.push(finding);
        }
      }
    });

    return findings.slice(0, 5); // Limit to top 5 findings
  }

  private countCitations(content: string): number {
    const citationMatches = content.match(/\[\d+\]/g);
    return citationMatches ? new Set(citationMatches).size : 0;
  }

  async validateReport(synthesis: SynthesisResult): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (synthesis.wordCount < 500) {
      issues.push('Report is too short (less than 500 words)');
    }

    if (synthesis.sectionsGenerated.length < 3) {
      issues.push('Report lacks sufficient structure (less than 3 sections)');
    }

    if (synthesis.citationsUsed === 0) {
      issues.push('Report contains no citations');
    }

    if (!synthesis.fullReport.includes('##')) {
      issues.push('Report lacks proper markdown formatting');
    }

    if (synthesis.keyFindings.length === 0) {
      issues.push('No key findings identified');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}