'use client';

import { useState, useEffect } from 'react';

export interface ResearchFormData {
  question: string;
  apiKey: string;
}

export interface ResearchFormProps {
  onSubmit: (data: ResearchFormData) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ResearchForm({ onSubmit, isLoading = false, disabled = false }: ResearchFormProps) {
  const [question, setQuestion] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Load API key from various sources
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('openrouter_api_key');
      if (storedKey) {
        setApiKey(storedKey);
      }
    }
  }, []);

  // Try to load API key from environment variable (server-side)
  useEffect(() => {
    if (!apiKey && typeof window !== 'undefined') {
      // In development, check if there's a default key available
      // This should be set via environment variables for security
      const defaultKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (defaultKey && (window.location.hostname === 'localhost' || window.location.hostname.includes('vercel.app'))) {
        setApiKey(defaultKey);
        localStorage.setItem('openrouter_api_key', defaultKey);
      }
    }
  }, [apiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (question.trim().length < 10) {
      alert('Please enter a research question of at least 10 characters');
      return;
    }

    if (apiKey.trim().length < 20) {
      alert('Please enter a valid OpenRouter API key');
      return;
    }

    // Save API key to localStorage
    localStorage.setItem('openrouter_api_key', apiKey.trim());

    onSubmit({
      question: question.trim(),
      apiKey: apiKey.trim()
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
          maxLength={2000}
        />
        <div className="mt-2 text-sm text-gray-500">
          {question.length}/2000 characters (minimum 10)
        </div>
      </div>

      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
          OpenRouter API Key
        </label>
        <input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-or-v1-..."
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={disabled || isLoading}
          required
        />
        <div className="mt-2 text-sm text-gray-500">
          Your API key will be saved locally and never shared
        </div>
        <div className="mt-2">
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm underline"
          >
            Get your free OpenRouter API key →
          </a>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          💡 Development tip: Add NEXT_PUBLIC_OPENROUTER_API_KEY to your .env.local file for automatic loading
          <br />
          ⚠️ Never commit API keys to your repository!
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Research typically takes 2-5 minutes
        </div>
        <button
          type="submit"
          disabled={disabled || isLoading || question.trim().length < 10 || !apiKey.trim()}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          {isLoading ? 'Starting Research...' : 'Start Research'}
        </button>
      </div>
    </form>
  );
}