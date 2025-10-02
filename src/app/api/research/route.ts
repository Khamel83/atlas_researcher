import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouterClient } from '@/lib/openrouter';
import { modelRouter } from '@/lib/models';
import { PlannerAgent } from '@/lib/agents/planner';
import { SearcherAgent } from '@/lib/agents/searcher';
import { EvaluatorAgent } from '@/lib/agents/evaluator';
import { SynthesizerAgent } from '@/lib/agents/synthesizer';
import { ReportStorage } from '@/lib/storage';
import { VercelReportStorage } from '@/lib/storage-vercel';

export async function POST(request: NextRequest) {
  try {
    const { question, apiKey } = await request.json();

    if (!question || !apiKey) {
      return NextResponse.json(
        { error: 'Question and API key are required' },
        { status: 400 }
      );
    }

    if (question.length < 10) {
      return NextResponse.json(
        { error: 'Question must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Create encoder for streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendProgress = (phase: string, progress: number, details?: string) => {
            const data = JSON.stringify({ phase, progress, details, timestamp: new Date().toISOString() });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          };

          const client = createOpenRouterClient(apiKey);
          const usageTracker = modelRouter.createModelUsageTracker();

          sendProgress('Initializing research pipeline', 0);

          // Phase 1: Planning
          sendProgress('Planning research strategy', 10);
          const planner = new PlannerAgent(client);
          const planningResult = await planner.planResearch(question);

          // Track planning model usage
          usageTracker.trackUsage(modelRouter.getModelForTask('planning'), 500, 300);

          sendProgress('Research strategy created', 20, `Found ${planningResult.subtopics.length} subtopics to investigate`);

          // Phase 2: Searching
          sendProgress('Searching for information', 25);
          const searcher = new SearcherAgent(client);
          const searchResults = await searcher.searchAllSubtopics(planningResult.subtopics, question);

          const totalSources = searchResults.reduce((sum, result) => sum + result.results.length, 0);
          sendProgress('Sources gathered', 40, `Found ${totalSources} potential sources`);

          // Phase 3: Evaluation
          sendProgress('Evaluating sources', 45);
          const evaluator = new EvaluatorAgent(client);
          const evaluationResults = await evaluator.evaluateSearchResults(searchResults);

          const highQualityResults = await evaluator.filterHighQualityContent(evaluationResults, 5, 4);
          const highQualityCount = highQualityResults.reduce((sum, result) => sum + result.evaluatedContent.length, 0);

          // Track evaluation model usage
          usageTracker.trackUsage(modelRouter.getModelForTask('reasoning'), 2000, 1500);

          sendProgress('Sources evaluated', 70, `${highQualityCount} high-quality sources identified`);

          // Phase 4: Synthesis
          sendProgress('Generating research report', 75);
          const synthesizer = new SynthesizerAgent(client);
          const synthesisResult = await synthesizer.synthesizeReport(question, planningResult, highQualityResults);

          // Track synthesis model usage
          usageTracker.trackUsage(modelRouter.getModelForTask('synthesis'), 3000, 2000);

          sendProgress('Finalizing report', 90);

          // Generate report metadata
          const filename = ReportStorage.generateFilename();
          const metadata = {
            filename,
            timestamp: new Date().toISOString(),
            query: question,
            wordCount: synthesisResult.wordCount,
            models_used: [synthesisResult.modelUsed],
            sectionsGenerated: synthesisResult.sectionsGenerated,
            keyFindings: synthesisResult.keyFindings,
            citationsUsed: synthesisResult.citationsUsed
          };

          const usage = usageTracker.getTotalUsage();

          sendProgress('Complete', 100, 'Research completed successfully');

          // Send final result with report content included
          const finalData = JSON.stringify({
            success: true,
            reportUrl: ReportStorage.getReportUrl(filename),
            filename,
            reportContent: synthesisResult.fullReport,
            metadata: {
              ...metadata,
              totalTokens: usage.totalTokens,
              modelsUsed: usage.modelsUsed,
              subtopicsInvestigated: planningResult.subtopics.length,
              sourcesEvaluated: totalSources
            }
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));

        } catch (error) {
          console.error('Research pipeline error:', error);

          let errorMessage = 'An unexpected error occurred';
          if (error instanceof Error) {
            if (error.message.includes('Invalid API key')) {
              errorMessage = 'Invalid OpenRouter API key';
            } else if (error.message.includes('Rate limit exceeded')) {
              errorMessage = 'Rate limit exceeded. Please try again later.';
            } else if (error.message.includes('Insufficient credits')) {
              errorMessage = 'Insufficient API credits. Please check your OpenRouter account.';
            } else {
              errorMessage = error.message;
            }
          }

          const errorData = JSON.stringify({
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}