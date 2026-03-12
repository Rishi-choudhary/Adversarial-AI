'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ProgressStep {
  id: string;
  label: string;
  status: 'done' | 'active' | 'waiting';
  detail?: string;
}

interface JobProgress {
  url: string;
  percentage: number;
  steps: ProgressStep[];
  sectionPreviews?: string[];
  error?: string;
}

export default function ProgressPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [progress, setProgress] = useState<JobProgress>({
    url: '',
    percentage: 0,
    steps: [
      { id: 'scrape', label: 'Scraping website...', status: 'waiting' },
      { id: 'images', label: 'Extracting images...', status: 'waiting' },
      { id: 'css', label: 'Extracting CSS & JS...', status: 'waiting' },
      { id: 'detect', label: 'Detecting sections...', status: 'waiting' },
      { id: 'convert', label: 'Converting sections to Liquid...', status: 'waiting' },
      { id: 'assemble', label: 'Assembling Shopify theme...', status: 'waiting' },
      { id: 'zip', label: 'Generating ZIP...', status: 'waiting' },
    ],
    sectionPreviews: [],
  });

  const [isComplete, setIsComplete] = useState(false);

  const connectSSE = useCallback(() => {
    const eventSource = new EventSource(`/api/jobs/${jobId}/status`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.error) {
          setProgress((prev) => ({ ...prev, error: data.error }));
          eventSource.close();
          return;
        }

        if (data.complete) {
          setIsComplete(true);
          eventSource.close();
          // Redirect to results page after a short delay
          setTimeout(() => {
            router.push(`/convert/${jobId}/results`);
          }, 1000);
          return;
        }

        setProgress((prev) => ({
          ...prev,
          url: data.url || prev.url,
          percentage: data.percentage ?? prev.percentage,
          steps: data.steps || prev.steps,
          sectionPreviews: data.sectionPreviews || prev.sectionPreviews,
        }));
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Retry connection after a delay
      setTimeout(connectSSE, 3000);
    };

    return eventSource;
  }, [jobId, router]);

  useEffect(() => {
    const eventSource = connectSSE();
    return () => eventSource.close();
  }, [connectSSE]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="text-green-500 text-lg">✅</span>;
      case 'active':
        return <span className="text-orange-500 text-lg animate-spin">🔄</span>;
      default:
        return <span className="text-slate-400 text-lg">⏳</span>;
    }
  };

  // Extract domain from URL for display
  const displayUrl = progress.url ? new URL(progress.url).hostname : 'website';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text">
              ThemeForge
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="card p-8">
            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Converting: <span className="text-orange-500">{displayUrl}</span>
            </h1>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
                <span>Progress</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full progress-bar rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Error Message */}
            {progress.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Error</span>
                </div>
                <p className="mt-2 text-red-600 dark:text-red-400 text-sm">{progress.error}</p>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-3 mb-8">
              {progress.steps.map((step) => (
                <div
                  key={step.id}
                  className={`step-indicator ${
                    step.status === 'done'
                      ? 'step-done'
                      : step.status === 'active'
                      ? 'step-active'
                      : 'step-waiting'
                  }`}
                >
                  {getStepIcon(step.status)}
                  <span
                    className={`flex-1 ${
                      step.status === 'waiting' ? 'text-slate-400 dark:text-slate-500' : ''
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.detail && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {step.detail}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Section Previews */}
            {progress.sectionPreviews && progress.sectionPreviews.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Section Previews
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {progress.sectionPreviews.map((preview, index) => (
                    <div key={index} className="section-preview flex-shrink-0 w-24 h-16">
                      <img
                        src={preview}
                        alt={`Section ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Message */}
            {isComplete && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ✅ Conversion complete! Redirecting to results...
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
