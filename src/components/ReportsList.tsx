'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ReportMetadata } from '@/lib/storage';

export interface ReportsListProps {
  className?: string;
  maxItems?: number;
}

export function ReportsList({ className = '', maxItems = 10 }: ReportsListProps) {
  const [reports, setReports] = useState<ReportMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [maxItems]);

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/reports?limit=${maxItems}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setError('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }, [maxItems]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateQuery = (query: string, maxLength: number = 60) => {
    return query.length > maxLength ? query.substring(0, maxLength) + '...' : query;
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 border border-gray-800 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Recent Research</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-gray-800 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 border border-gray-800 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Recent Research</h3>
        <div className="text-red-400 text-sm">{error}</div>
        <button
          onClick={fetchReports}
          className="mt-3 text-blue-400 hover:text-blue-300 text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 border border-gray-800 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Recent Research</h3>
        <p className="text-gray-500 text-sm">No research reports yet. Start your first research project!</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 border border-gray-800 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Recent Research</h3>
        <button
          onClick={fetchReports}
          className="text-gray-500 hover:text-gray-400 text-sm"
          title="Refresh"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {reports.map((report) => (
          <Link
            key={report.filename}
            href={`/reports/${report.filename.replace('.md', '')}`}
            className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200 group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-gray-100 font-medium group-hover:text-blue-400 transition-colors line-clamp-2">
                  {truncateQuery(report.query)}
                </h4>
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  {formatDate(report.timestamp)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{report.wordCount.toLocaleString()} words</span>
                <span>{report.models_used.length} models</span>
                {report.models_used.length > 0 && (
                  <span className="truncate max-w-[200px]" title={report.models_used.join(', ')}>
                    {report.models_used[0]}{report.models_used.length > 1 ? ' + more' : ''}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {reports.length >= maxItems && (
        <div className="mt-4 text-center">
          <button className="text-blue-400 hover:text-blue-300 text-sm underline">
            View all reports
          </button>
        </div>
      )}
    </div>
  );
}