export function getOpenRouterApiKey(): string {
  // 1. Check environment variable (production)
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY;
  }

  // 2. Check localStorage (user manually entered)
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('openrouter_api_key');
    if (storedKey) {
      return storedKey;
    }
  }

  // 3. Development fallback - provide a demo key or clear instructions
  if (process.env.NODE_ENV === 'development') {
    // For development, you could either:
    // Option A: Return a development key (if you have one)
    // return 'sk-or-dev-demo-key-here';

    // Option B: Return empty to show the form with helpful message
    return '';
  }

  return '';
}

export function needsApiKey(): boolean {
  return !getOpenRouterApiKey();
}

export function getApiKeySource(): string {
  if (process.env.OPENROUTER_API_KEY) {
    return 'Environment variable (production)';
  }

  if (typeof window !== 'undefined' && localStorage.getItem('openrouter_api_key')) {
    return 'Saved in browser';
  }

  return 'Not configured';
}