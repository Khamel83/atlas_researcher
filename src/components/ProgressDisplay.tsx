'use client';

import { useState, useEffect } from 'react';

export interface ProgressData {
  phase: string;
  progress: number;
  details?: string;
  timestamp: string;
}

export interface ProgressDisplayProps {
  isActive: boolean;
  onComplete?: (result: {
    reportUrl: string;
    metadata?: {
      wordCount?: number;
      modelsUsed?: string[];
      totalTokens?: number;
      subtopicsInvestigated?: number;
    };
  }) => void;
  onError?: (error: string) => void;
}

export function ProgressDisplay({ isActive, onComplete, onError }: ProgressDisplayProps) {
  const [currentPhase, setCurrentPhase] = useState('');
  const [progress, setProgress] = useState(0);
  const [details, setDetails] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    const eventSource = new EventSource('/api/research', {
      method: 'POST',
      body: JSON.stringify({ question: '', apiKey: '' }),
      headers: {
        'Content-Type': 'application/json',
      },
    } as any);

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressData | {
          success: boolean;
          error?: string;
          [key: string]: unknown;
        } = JSON.parse(event.data);

        if ('phase' in data && 'progress' in data) {
          // Progress update
          setCurrentPhase(data.phase);
          setProgress(data.progress);
          setDetails(data.details || '');

          if (data.progress === 100) {
            setIsComplete(true);
            eventSource.close();
          }
        } else if (data.success && typeof data === 'object' && 'reportUrl' in data) {
          // Research completed
          onComplete?.(data as {
            reportUrl: string;
            metadata?: {
              wordCount?: number;
              modelsUsed?: string[];
              totalTokens?: number;
              subtopicsInvestigated?: number;
            };
          });
          setIsComplete(true);
          eventSource.close();
        } else if (data.error) {
          // Research failed
          onError?.(data.error);
          setIsComplete(true);
          eventSource.close();
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      onError?.('Connection error during research');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isActive, onComplete, onError]);

  useEffect(() => {
    if (!isActive) {
      setCurrentPhase('');
      setProgress(0);
      setDetails('');
      setIsComplete(false);
    }
  }, [isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-900 rounded-lg p-6 border border-gray-800">
      <div className="space-y-4">
        {/* Phase indicator */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">
              {currentPhase || 'Initializing...'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {details || 'Preparing your research...'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">
              {progress}%
            </div>
            <div className="text-xs text-gray-500">
              {isComplete ? 'Complete' : 'In Progress'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white opacity-20 animate-pulse" />
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center">
          {isComplete ? (
            <div className="flex items-center space-x-2 text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Research Complete</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-sm">Processing...</span>
            </div>
          )}
        </div>

        {/* Estimated time remaining */}
        {!isComplete && progress > 0 && (
          <div className="text-center text-xs text-gray-500">
            Estimated time remaining: {Math.ceil((100 - progress) * 2)} seconds
          </div>
        )}
      </div>
    </div>
  );
}