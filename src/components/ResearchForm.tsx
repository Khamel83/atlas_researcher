'use client';

import { useState, useEffect } from 'react';

export interface ResearchFormData {
  question: string;
  researchMode?: 'normal' | 'max';
}

export interface ResearchFormProps {
  onSubmit: (data: ResearchFormData) => void;
  isLoading?: boolean;
  disabled?: boolean;
  initialMode?: 'normal' | 'max';
}

export function ResearchForm({ onSubmit, isLoading = false, disabled = false, initialMode = 'normal' }: ResearchFormProps) {
  const [question, setQuestion] = useState('');
  const [researchMode, setResearchMode] = useState<'normal' | 'max'>(initialMode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (question.trim().length < 10) {
      alert('Please enter a research question of at least 10 characters');
      return;
    }

    onSubmit({
      question: question.trim(),
      researchMode
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="question" className="block text-sm font-medium text-gray-300 mb-2">
          Research Question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to research? Be specific and detailed..."
          className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={disabled || isLoading}
          minLength={10}
          maxLength={10000}
        />
        <div className="mt-2 text-sm text-gray-500">
          {question.length}/10000 characters (minimum 10)
        </div>
      </div>

      {/* Research Mode Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Research Depth
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
              researchMode === 'normal'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            }`}
            onClick={() => setResearchMode('normal')}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                researchMode === 'normal'
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-600'
              }`}>
                {researchMode === 'normal' && (
                  <div className="w-full h-full rounded-full bg-white scale-50"></div>
                )}
              </div>
              <div>
                <h4 className="font-medium text-gray-100">Normal</h4>
                <p className="text-sm text-gray-400">10 sources per subtopic</p>
              </div>
            </div>
          </div>

          <div
            className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
              researchMode === 'max'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            }`}
            onClick={() => setResearchMode('max')}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                researchMode === 'max'
                  ? 'border-purple-500 bg-purple-500'
                  : 'border-gray-600'
              }`}>
                {researchMode === 'max' && (
                  <div className="w-full h-full rounded-full bg-white scale-50"></div>
                )}
              </div>
              <div>
                <h4 className="font-medium text-gray-100">Max</h4>
                <p className="text-sm text-gray-400">30+ sources per subtopic</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Research typically takes 2-5 minutes
        </div>
        <button
          type="submit"
          disabled={disabled || isLoading || question.trim().length < 10}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          {isLoading ? 'Starting Research...' : 'Start Research'}
        </button>
      </div>
    </form>
  );
}