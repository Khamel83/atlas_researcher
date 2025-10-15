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

  useEffect(() => {
    fetchReport();
  }, [filename, fetchReport]);

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
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-100" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wide">Generated</div>
                    <div className="text-gray-200 font-medium">{formatDate(report.metadata.timestamp)}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-100" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wide">Word Count</div>
                    <div className="text-gray-200 font-medium">{report.metadata.wordCount?.toLocaleString() || 0} words</div>
                  </div>
                </div>

                {report.metadata.models_used && report.metadata.models_used.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-100" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs uppercase tracking-wide">AI Model</div>
                      <div className="text-gray-200 font-medium truncate max-w-[200px]" title={report.metadata.models_used.join(', ')}>
                        {report.metadata.models_used[0]}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

      <style jsx global>{`
        .markdown-content {
          color: #e5e7eb;
          line-height: 1.7;
          font-size: 16px;
        }

        .markdown-content h1 {
          color: #ffffff;
          font-size: 2.5rem;
          font-weight: 700;
          margin-top: 3rem;
          margin-bottom: 1.5rem;
          line-height: 1.2;
          border-bottom: 2px solid #374151;
          padding-bottom: 0.75rem;
        }

        .markdown-content h2 {
          color: #ffffff;
          font-size: 2rem;
          font-weight: 600;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          line-height: 1.3;
          border-bottom: 1px solid #4b5563;
          padding-bottom: 0.5rem;
        }

        .markdown-content h3 {
          color: #f3f4f6;
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .markdown-content h4 {
          color: #f3f4f6;
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }

        .markdown-content h5,
        .markdown-content h6 {
          color: #d1d5db;
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .markdown-content p {
          margin-bottom: 1.25rem;
          line-height: 1.7;
          color: #d1d5db;
        }

        .markdown-content ul,
        .markdown-content ol {
          margin-bottom: 1.25rem;
          padding-left: 2rem;
        }

        .markdown-content li {
          margin-bottom: 0.75rem;
          line-height: 1.7;
          color: #d1d5db;
        }

        .markdown-content ul li {
          list-style-type: none;
          position: relative;
        }

        .markdown-content ul li::before {
          content: "•";
          color: #60a5fa;
          font-weight: bold;
          position: absolute;
          left: -1.25rem;
        }

        .markdown-content ol li {
          color: #60a5fa;
          font-weight: 600;
          margin-right: 0.5rem;
        }

        .markdown-content ol li span {
          color: #d1d5db;
          font-weight: normal;
        }

        .markdown-content blockquote {
          border-left: 4px solid #60a5fa;
          background: linear-gradient(to right, rgba(96, 165, 250, 0.1), transparent);
          padding: 1rem 1.5rem;
          margin: 1.5rem 0;
          color: #9ca3af;
          font-style: italic;
          border-radius: 0 0.5rem 0.5rem 0;
        }

        .markdown-content blockquote p {
          margin-bottom: 0;
        }

        .markdown-content code {
          background-color: #374151;
          color: #fbbf24;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          border: 1px solid #4b5563;
        }

        .markdown-content pre {
          background-color: #1f2937;
          padding: 1.5rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          margin: 1.5rem 0;
          border: 1px solid #374151;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }

        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
          color: #e5e7eb;
          border: none;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .markdown-content a {
          color: #60a5fa;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .markdown-content a:hover {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .markdown-content strong,
        .markdown-content b {
          color: #ffffff;
          font-weight: 600;
        }

        .markdown-content em,
        .markdown-content i {
          color: #f3f4f6;
          font-style: italic;
        }

        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          background-color: #1f2937;
          border-radius: 0.75rem;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }

        .markdown-content th,
        .markdown-content td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #374151;
        }

        .markdown-content th {
          background-color: #374151;
          color: #ffffff;
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .markdown-content tr:last-child td {
          border-bottom: none;
        }

        .markdown-content tr:hover {
          background-color: rgba(55, 65, 81, 0.5);
        }

        .markdown-content hr {
          border: none;
          height: 2px;
          background: linear-gradient(to right, transparent, #4b5563, transparent);
          margin: 3rem 0;
        }

        .markdown-content .sources {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 2px solid #374151;
        }

        .markdown-content .sources h2 {
          color: #60a5fa;
          font-size: 1.5rem;
          margin-bottom: 1rem;
          border-bottom: none;
          padding-bottom: 0;
        }

        .markdown-content .sources ol {
          padding-left: 1.5rem;
        }

        .markdown-content .sources li {
          font-size: 0.875rem;
          color: #9ca3af;
          margin-bottom: 0.5rem;
        }

        /* Executive Summary styling */
        .markdown-content h1 + p em {
          display: block;
          background: linear-gradient(135deg, #1e40af, #3730a3);
          color: #e0e7ff;
          padding: 1.5rem;
          border-radius: 0.75rem;
          margin: 1.5rem 0;
          font-style: normal;
          border-left: 4px solid #60a5fa;
        }

        /* Better section spacing */
        .markdown-content h2 + ul,
        .markdown-content h2 + ol,
        .markdown-content h2 + p {
          margin-top: 1rem;
        }

        /* Code blocks with syntax highlighting appearance */
        .markdown-content pre::-webkit-scrollbar {
          height: 8px;
        }

        .markdown-content pre::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 4px;
        }

        .markdown-content pre::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 4px;
        }

        .markdown-content pre::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}