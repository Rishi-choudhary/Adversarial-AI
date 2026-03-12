'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate URL
    if (!url.trim()) {
      setError('Please enter a website URL');
      return;
    }

    try {
      // Add https:// if not present
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      new URL(normalizedUrl); // Validate URL format
      
      setIsLoading(true);

      // Start conversion job
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start conversion');
      }

      const { jobId } = await response.json();
      
      // Redirect to progress page
      router.push(`/convert/${jobId}`);
    } catch (err) {
      setIsLoading(false);
      if (err instanceof TypeError) {
        setError('Please enter a valid URL');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text">
              ThemeForge
            </span>
          </div>
          <button className="btn-secondary text-sm py-2 px-4">
            Sign In
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl text-center">
          {/* Hero Text */}
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Convert Any Website Into a{' '}
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text">
              Shopify Theme
            </span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
            in Minutes. Automatically.
          </p>

          {/* URL Input Form */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="card p-2 mb-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-website.com"
                className="input-url border-0"
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm mb-4 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary text-lg py-4 px-8 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Starting Conversion...
                </span>
              ) : (
                <>Generate Shopify Theme →</>
              )}
            </button>
          </form>

          {/* Feature List */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="feature-check">Full Liquid sections</div>
            <div className="feature-check">Schema editor-ready</div>
            <div className="feature-check">All images included</div>
            <div className="feature-check">Download in seconds</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>ThemeForge © {new Date().getFullYear()} - Transform any website into a Shopify theme</p>
      </footer>
    </div>
  );
}
