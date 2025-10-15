'use client';

import { useState } from 'react';
import { ResearchForm, ResearchFormData } from '@/components/ResearchForm';
import { ProgressDisplay } from '@/components/ProgressDisplay';
import { ReportsList } from '@/components/ReportsList';

export default function Home() {
  const [isResearching, setIsResearching] = useState(false);
  const [researchData, setResearchData] = useState<ResearchFormData | null>(null);
  const [researchResult, setResearchResult] = useState<{
    reportUrl: string;
    metadata?: {
      wordCount?: number;
      modelsUsed?: string[];
      totalTokens?: number;
      subtopicsInvestigated?: number;
    };
  } | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<{
    sessionId: string;
    existingProgress: number;
    existingPhase: string;
  } | null>(null);
  const [currentResearchMode, setCurrentResearchMode] = useState<'normal' | 'max'>('normal');

  const handleResearchStart = (data: ResearchFormData) => {
    setIsResearching(true);
    setResearchData(data);
    setCurrentResearchMode(data.researchMode || 'normal');
    setResearchResult(null);
    setResearchError(null);
  };

  const handleProgressComplete = (result: {
    reportUrl: string;
    metadata?: {
      wordCount?: number;
      modelsUsed?: string[];
      totalTokens?: number;
      subtopicsInvestigated?: number;
    };
    reportContent?: string;
    filename?: string;
  }) => {
    setResearchResult(result);
    setIsResearching(false);

    // If report content is included, display it directly
    if (result.reportContent && result.filename) {
      // Store in sessionStorage for the report viewer
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`report_${result.filename}`, result.reportContent);
        sessionStorage.setItem(`metadata_${result.filename}`, JSON.stringify(result.metadata));
        window.location.href = result.reportUrl;
      }
    } else {
      // Redirect to the report page
      if (typeof window !== 'undefined' && result.reportUrl) {
        window.location.href = result.reportUrl;
      }
    }
  };

  const handleProgressError = (error: string) => {
    setResearchError(error);
    setIsResearching(false);
  };

  const handleResumeAvailable = (data: {
    sessionId: string;
    existingProgress: number;
    existingPhase: string;
  }) => {
    setResumeData(data);
    setIsResearching(false);
  };

  const handleResumeResearch = () => {
    if (!resumeData || !researchData) return;

    setIsResearching(true);
    setResumeData(null);
    setResearchData({
      ...researchData,
      sessionId: resumeData.sessionId,
      resume: true,
      researchMode: currentResearchMode
    });
  };

  const handleStartNewResearch = () => {
    if (!researchData) return;

    setIsResearching(true);
    setResumeData(null);
    setResearchData({
      question: researchData.question,
      researchMode: currentResearchMode
    });
  };

  const handleNewResearch = () => {
    setResearchResult(null);
    setResearchError(null);
    setResumeData(null);
    setIsResearching(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100-4h-.5a1 1 0 000-2H8a2 2 0 012-2v1h4v-1a2 2 0 00-2 2h-.5a1 1 0 000 2H14a2 2 0 110 4h-2a2 2 0 110-4h.5a1 1 0 000-2H12a2 2 0 00-2-2v1H6V5z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold">Atlas Researcher</h1>
            </div>
            <div className="text-sm text-gray-500">
              Multi-Agent Research System
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Research Form - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-8">
            {/* Welcome Section */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-gray-100">
                Deep Research with AI Agents
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Get comprehensive research reports on any topic using OpenRouter&apos;s free AI models.
                Our multi-agent system analyzes multiple sources to deliver evidence-based insights.
              </p>
            </div>

            {/* Error Display */}
            {researchError && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-red-400 font-medium">Research Failed</h3>
                    <p className="text-red-300 text-sm mt-1">{researchError}</p>
                  </div>
                </div>
                <button
                  onClick={handleNewResearch}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Research Form */}
            {!isResearching && !researchResult && (
              <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
                <h3 className="text-xl font-semibold text-gray-100 mb-6">Start Your Research</h3>
                <ResearchForm
                  onSubmit={handleResearchStart}
                  disabled={isResearching}
                  initialMode={currentResearchMode}
                />
                <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                  <p className="text-sm text-green-300">
                    ✅ <strong>API Configured:</strong> OpenRouter API key is pre-configured on the server. Just enter your research question and start!
                  </p>
                </div>
              </div>
            )}

            {/* Resume Available Display */}
            {resumeData && (
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-yellow-400 font-medium">Resume Previous Research?</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-300 mb-4">
                  <p>Found a previous research session for this question:</p>
                  <p>📊 Progress: {resumeData.existingProgress}%</p>
                  <p>🔄 Last phase: {resumeData.existingPhase}</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleResumeResearch}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Resume Research
                  </button>
                  <button
                    onClick={handleStartNewResearch}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Start New Research
                  </button>
                </div>
              </div>
            )}

            {/* Progress Display */}
            {isResearching && (
              <ProgressDisplay
                isActive={isResearching}
                researchData={researchData}
                onComplete={handleProgressComplete}
                onError={handleProgressError}
                onResumeAvailable={handleResumeAvailable}
              />
            )}

            {/* Success Display */}
            {researchResult && (
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-green-400 font-medium">Research Complete!</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>📄 {researchResult.metadata?.wordCount?.toLocaleString() || 0} words</p>
                  <p>🧠 {researchResult.metadata?.modelsUsed?.length || 0} AI models used</p>
                  <p>📊 {researchResult.metadata?.totalTokens?.toLocaleString() || 0} tokens processed</p>
                  <p>🔍 {researchResult.metadata?.subtopicsInvestigated || 0} subtopics investigated</p>
                </div>
                <div className="mt-4 flex space-x-3">
                  <a
                    href={researchResult.reportUrl}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                  >
                    View Report
                  </a>
                  <button
                    onClick={handleNewResearch}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                  >
                    New Research
                  </button>
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
              <h3 className="text-xl font-semibold text-gray-100 mb-6">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-100">Planning</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      AI breaks your question into specific research subtopics
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-100">Searching</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Multiple AI agents search for relevant information
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-100">Evaluation</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Sources are analyzed for credibility and relevance
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-100">Synthesis</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Comprehensive report is generated with citations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Recent Reports */}
          <div className="space-y-8">
            <ReportsList />

            {/* Features */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Features</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Multi-agent research pipeline</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Source credibility assessment</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Citation-ready reports</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Model fallback system</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Permanent report storage</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Free model usage</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>Atlas Researcher - Multi-Agent AI Research System</p>
            <p className="mt-2">Powered by OpenRouter&apos;s free AI models</p>
          </div>
        </div>
      </footer>
    </div>
  );
}