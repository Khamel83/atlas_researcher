'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default function ReportViewer() {
  const params = useParams();
  const router = useRouter();
  const filename = params.filename as string;

  const [report, setReport] = useState<{ content: string; metadata: {
    query?: string;
    timestamp?: string;
    wordCount?: number;
    models_used?: string[];
  } | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [filename, fetchReport]);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First try to get from sessionStorage (for recent reports)
      if (typeof window !== 'undefined') {
        const sessionContent = sessionStorage.getItem(`report_${filename}`);
        const sessionMetadata = sessionStorage.getItem(`metadata_${filename}`);

        if (sessionContent) {
          setReport({
            content: sessionContent,
            metadata: sessionMetadata ? JSON.parse(sessionMetadata) : null
          });
          return;
        }
      }

      // Fallback to API
      const response = await fetch(`/api/reports/${filename}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Report not found');
        }
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [filename]);

  const downloadReport = async () => {
    if (!report) return;

    try {
      setIsDownloading(true);

      const blob = new Blob([report.content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  const shareReport = async () => {
    if (!report) return;

    try {
      const shareUrl = window.location.href;

      if (navigator.share) {
        await navigator.share({
          title: report.metadata?.query || 'Research Report',
          text: `Check out this research report: ${report.metadata?.query}`,
          url: shareUrl,
        });
      } else {
        // Fallback - copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('Report URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to share report:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        alert('Failed to share report');
      }
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-8 text-center">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <h1 className="text-2xl font-bold text-red-400 mb-2">Report Not Found</h1>
            <p className="text-red-300 mb-6">{error}</p>
            <div className="space-x-4">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Back to Home
              </Link>
              <button
                onClick={() => router.back()}
                className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderMarkdown = (content: string) => {
    const html = marked(content, {
      breaks: true,
      gfm: true,
    });

    // Sanitize HTML to prevent XSS
    return DOMPurify.sanitize(html);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-400 hover:text-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Research</span>
            </Link>

            <div className="flex items-center space-x-2">
              <button
                onClick={shareReport}
                className="p-2 text-gray-400 hover:text-gray-100 transition-colors"
                title="Share report"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button
                onClick={downloadReport}
                disabled={isDownloading}
                className="p-2 text-gray-400 hover:text-gray-100 transition-colors disabled:opacity-50"
                title="Download report"
              >
                {isDownloading ? (
                  <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Report Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Report Header */}
        <div className="mb-8 pb-6 border-b border-gray-800">
          <h1 className="text-3xl font-bold text-gray-100 mb-4">
            {report.metadata?.query || 'Research Report'}
          </h1>

          {report.metadata && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>{formatDate(report.metadata.timestamp)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <span>{report.metadata.wordCount?.toLocaleString() || 0} words</span>
              </div>

              {report.metadata.models_used && report.metadata.models_used.length > 0 && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  <span>{report.metadata.models_used.join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Report Body */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content) }}
          />
        </div>

        {/* Report Footer */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Generated by Atlas Researcher
            </div>
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Start New Research</span>
            </Link>
          </div>
        </div>
      </main>

      <style jsx>{`
        .markdown-content {
          color: inherit;
        }

        .markdown-content h1 {
          color: #f3f4f6;
          font-size: 2rem;
          font-weight: bold;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .markdown-content h2 {
          color: #f3f4f6;
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .markdown-content h3 {
          color: #e5e7eb;
          font-size: 1.25rem;
          font-weight: bold;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .markdown-content p {
          margin-bottom: 1rem;
          line-height: 1.7;
        }

        .markdown-content ul,
        .markdown-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }

        .markdown-content li {
          margin-bottom: 0.5rem;
        }

        .markdown-content blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #9ca3af;
          font-style: italic;
        }

        .markdown-content code {
          background-color: #374151;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }

        .markdown-content pre {
          background-color: #1f2937;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
        }

        .markdown-content a {
          color: #60a5fa;
          text-decoration: underline;
        }

        .markdown-content a:hover {
          color: #3b82f6;
        }

        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .markdown-content th,
        .markdown-content td {
          border: 1px solid #374151;
          padding: 0.5rem;
          text-align: left;
        }

        .markdown-content th {
          background-color: #1f2937;
        }
      `}</style>
    </div>
  );
}