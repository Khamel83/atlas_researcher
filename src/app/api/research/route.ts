import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouterClient } from '@/lib/openrouter';
import { modelRouter } from '@/lib/models';
import { PlannerAgent } from '@/lib/agents/planner';
import { SearcherAgent } from '@/lib/agents/searcher';
import { EvaluatorAgent } from '@/lib/agents/evaluator';
import { SynthesizerAgent } from '@/lib/agents/synthesizer';
import { ReportStorage } from '@/lib/storage';
import { VercelReportStorage } from '@/lib/storage-vercel';
import { researchSessionStorage, ResearchSession } from '@/lib/research-session';

interface ResearchExecutionParams {
  session: ResearchSession;
  question: string;
  client: any;
  usageTracker: any;
  sendProgress: (phase: string, progress: number, details?: string) => void;
  controller: any;
  encoder: any;
  researchMode?: 'normal' | 'max';
}

async function executeResearchWithProgression(params: ResearchExecutionParams) {
  const { session, question, client, usageTracker, sendProgress, controller, encoder, researchMode } = params;

  let planningResult = session.planningResult;
  let searchResults = session.searchResults;
  let evaluationResults = session.evaluationResults;
  let synthesisResult = session.synthesisResult;

  // Phase 1: Planning (if not already completed)
  if (!planningResult) {
    sendProgress('Planning research strategy', 10);
    researchSessionStorage.updateSession(session.id, { status: 'planning' });

    const planner = new PlannerAgent(client);
    planningResult = await planner.planResearch(question);

    // Track planning model usage
    usageTracker.trackUsage(modelRouter.getModelForTask('planning'), 500, 300);

    // Save planning result
    researchSessionStorage.updateSession(session.id, {
      planningResult,
      status: 'planning'
    });

    sendProgress('Research strategy created', 20, `Found ${planningResult.subtopics.length} subtopics to investigate`);
  } else {
    sendProgress('Resuming from planning phase', 20, `Using existing strategy with ${planningResult.subtopics.length} subtopics`);
  }

  // Phase 2: Searching (if not already completed)
  if (!searchResults) {
    sendProgress('Searching for information', 25);
    researchSessionStorage.updateSession(session.id, { status: 'searching' });

    const searcher = new SearcherAgent(client);

    // Add progress updates during search
    const searchInterval = setInterval(() => {
      sendProgress('Searching for information', 25, `Searching web sources...`);
    }, 5000);

    searchResults = await searcher.searchAllSubtopics(planningResult.subtopics, question);
    clearInterval(searchInterval);

    const totalSources = searchResults.reduce((sum, result) => sum + result.results.length, 0);

    // Save search results
    researchSessionStorage.updateSession(session.id, {
      searchResults,
      status: 'searching'
    });

    sendProgress('Sources gathered', 40, `Found ${totalSources} potential sources`);
  } else {
    const totalSources = searchResults.reduce((sum, result) => sum + result.results.length, 0);
    sendProgress('Resuming from search phase', 40, `Using ${totalSources} previously found sources`);
  }

  // Phase 3: Evaluation (if not already completed)
  if (!evaluationResults) {
    sendProgress('Evaluating sources', 45);
    researchSessionStorage.updateSession(session.id, { status: 'evaluating' });

    const evaluator = new EvaluatorAgent(client, researchMode);

    // Add progress updates during evaluation
    const evalInterval = setInterval(() => {
      sendProgress('Evaluating sources', 45, `Analyzing source credibility...`);
    }, 5000);

    evaluationResults = await evaluator.evaluateSearchResults(searchResults);
    clearInterval(evalInterval);

    const evalInterval2 = setInterval(() => {
      sendProgress('Evaluating sources', 60, `Filtering high-quality content...`);
    }, 5000);

    const highQualityResults = await evaluator.filterHighQualityContent(evaluationResults, 5, 4);
    clearInterval(evalInterval2);
    const highQualityCount = highQualityResults.reduce((sum, result) => sum + result.evaluatedContent.length, 0);

    // Save evaluation results
    researchSessionStorage.updateSession(session.id, {
      evaluationResults,
      status: 'evaluating'
    });

    // Track evaluation model usage
    usageTracker.trackUsage(modelRouter.getModelForTask('reasoning'), 2000, 1500);

    sendProgress('Sources evaluated', 70, `${highQualityCount} high-quality sources identified`);
  } else {
    const highQualityCount = evaluationResults.reduce((sum, result) => sum + result.evaluatedContent.length, 0);
    sendProgress('Resuming from evaluation phase', 70, `Using ${highQualityCount} previously evaluated sources`);
  }

  // Phase 4: Synthesis (if not already completed)
  if (!synthesisResult) {
    sendProgress('Generating research report', 75);
    researchSessionStorage.updateSession(session.id, { status: 'synthesizing' });

    const synthesizer = new SynthesizerAgent(client);

    // Add progress updates during synthesis
    const synthInterval = setInterval(() => {
      sendProgress('Generating research report', 75, `Writing comprehensive report...`);
    }, 5000);

    synthesisResult = await synthesizer.synthesizeReport(question, planningResult, evaluationResults);
    clearInterval(synthInterval);

    // Save synthesis result
    researchSessionStorage.updateSession(session.id, {
      synthesisResult,
      status: 'synthesizing'
    });

    // Track synthesis model usage
    usageTracker.trackUsage(modelRouter.getModelForTask('synthesis'), 3000, 2000);
  } else {
    sendProgress('Resuming from synthesis phase', 75, `Using previously generated report`);
  }

  return {
    planningResult,
    searchResults,
    evaluationResults,
    synthesisResult
  };
}

export async function POST(request: NextRequest) {
  try {
    const { question, sessionId, resume, researchMode } = await request.json();

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Use API key from environment variable
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured on server' },
        { status: 500 }
      );
    }

    if (question.length < 10) {
      return NextResponse.json(
        { error: 'Question must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Handle session management
    let session: ResearchSession;

    if (resume && sessionId) {
      // Resume existing session
      session = researchSessionStorage.resumeSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found or cannot be resumed' },
          { status: 404 }
        );
      }
    } else if (sessionId) {
      // Check for existing session
      session = researchSessionStorage.getSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
    } else {
      // Create new session, but first check if there's a resumable one
      const resumableSession = researchSessionStorage.canResumeSession(question);
      if (resumableSession) {
        return NextResponse.json({
          resumeAvailable: true,
          sessionId: resumableSession.id,
          existingProgress: resumableSession.progress,
          existingPhase: resumableSession.currentPhase
        });
      }

      session = researchSessionStorage.createSession(question);
    }

    // Create encoder for streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendProgress = (phase: string, progress: number, details?: string) => {
            try {
              const data = JSON.stringify({
                phase,
                progress,
                details,
                sessionId: session.id,
                timestamp: new Date().toISOString()
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));

              // Update session progress
              researchSessionStorage.updateSession(session.id, {
                status: session.status,
                progress,
                currentPhase: phase,
                details
              });
            } catch (error) {
              console.warn('Failed to send progress update:', error);
              // Don't throw - just continue without sending this update
            }
          };

          const client = createOpenRouterClient(apiKey);
          const usageTracker = modelRouter.createModelUsageTracker();

          sendProgress('Initializing research pipeline', 0);

          // Flush the first update immediately to establish connection
          await new Promise(resolve => setTimeout(resolve, 100));

          // Execute research with progressive saving and resumption capability
          const researchData = await executeResearchWithProgression({
            session,
            question,
            client,
            usageTracker,
            sendProgress,
            controller,
            encoder,
            researchMode: researchMode || 'normal'
          });

          sendProgress('Finalizing report', 90);

          // Generate report metadata
          const filename = ReportStorage.generateFilename();
          const totalSources = researchData.searchResults.reduce((sum, result) => sum + result.results.length, 0);

          // Save the report to storage
          try {
            await ReportStorage.saveReport(
              researchData.synthesisResult.fullReport,
              question,
              [researchData.synthesisResult.modelUsed]
            );
          } catch (saveError) {
            console.warn('Failed to save report to filesystem:', saveError);
            // Continue even if saving fails - the content is still returned in the response
          }

          const metadata = {
            filename,
            timestamp: new Date().toISOString(),
            query: question,
            wordCount: researchData.synthesisResult.wordCount,
            models_used: [researchData.synthesisResult.modelUsed],
            sectionsGenerated: researchData.synthesisResult.sectionsGenerated,
            keyFindings: researchData.synthesisResult.keyFindings,
            citationsUsed: researchData.synthesisResult.citationsUsed
          };

          const usage = usageTracker.getTotalUsage();

          // Mark session as completed
          researchSessionStorage.updateSession(session.id, {
            status: 'completed',
            progress: 100,
            currentPhase: 'Complete',
            metadata: {
              totalTokens: usage.totalTokens,
              modelsUsed: usage.modelsUsed,
              subtopicsInvestigated: researchData.planningResult.subtopics.length,
              sourcesEvaluated: totalSources
            }
          });

          sendProgress('Complete', 100, 'Research completed successfully');

          // Send final result with report content included
          const finalData = JSON.stringify({
            success: true,
            reportUrl: ReportStorage.getReportUrl(filename),
            filename,
            reportContent: researchData.synthesisResult.fullReport,
            sessionId: session.id,
            metadata: {
              ...metadata,
              totalTokens: usage.totalTokens,
              modelsUsed: usage.modelsUsed,
              subtopicsInvestigated: researchData.planningResult.subtopics.length,
              sourcesEvaluated: totalSources
            }
          });

          try {
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          } catch (error) {
            console.warn('Failed to send final result:', error);
          }

        } catch (error) {
          console.error('Research pipeline error:', error);

          // Mark session as failed
          researchSessionStorage.updateSession(session.id, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });

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
            sessionId: session.id,
            timestamp: new Date().toISOString()
          });

          try {
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          } catch (writeError) {
            console.warn('Failed to send error message:', writeError);
          }
        } finally {
          try {
            controller.close();
          } catch (closeError) {
            console.warn('Controller already closed:', closeError);
          }
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

// Session management endpoints
export async function PUT(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = researchSessionStorage.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('GET session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const deleted = researchSessionStorage.deleteSession(sessionId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}