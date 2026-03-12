import { getRedis } from '../lib/redis';

export interface ProgressStep {
  id: string;
  label: string;
  status: 'done' | 'active' | 'waiting';
  detail?: string;
}

export interface ProgressData {
  url: string;
  percentage: number;
  steps: ProgressStep[];
  sectionPreviews?: string[];
  complete?: boolean;
  error?: string;
  fileSize?: string;
}

// Channel prefix for progress updates
const CHANNEL_PREFIX = 'themeforge:progress:';

/**
 * Emit progress update for a job
 */
export async function emitProgress(
  jobId: string,
  data: ProgressData
): Promise<void> {
  const redis = getRedis();
  const channel = `${CHANNEL_PREFIX}${jobId}`;
  
  // Publish to Redis channel
  await redis.publish(channel, JSON.stringify(data));
  
  // Also store latest progress for polling
  await redis.setex(
    `themeforge:progress:latest:${jobId}`,
    3600, // 1 hour TTL
    JSON.stringify(data)
  );
}

/**
 * Subscribe to progress updates for a job
 */
export async function subscribeToProgress(
  jobId: string,
  callback: (data: ProgressData) => void
): Promise<() => void> {
  const redis = getRedis();
  const subscriber = redis.duplicate();
  const channel = `${CHANNEL_PREFIX}${jobId}`;

  subscriber.subscribe(channel);

  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const data = JSON.parse(message) as ProgressData;
        callback(data);
      } catch (error) {
        console.error('Failed to parse progress message:', error);
      }
    }
  });

  // Return unsubscribe function
  return async () => {
    await subscriber.unsubscribe(channel);
    await subscriber.quit();
  };
}

/**
 * Get latest progress for a job
 */
export async function getLatestProgress(
  jobId: string
): Promise<ProgressData | null> {
  const redis = getRedis();
  const data = await redis.get(`themeforge:progress:latest:${jobId}`);
  
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as ProgressData;
  } catch {
    return null;
  }
}

/**
 * Create an SSE-compatible progress stream
 */
export function createProgressStream(
  jobId: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let intervalId: NodeJS.Timeout | null = null;

  return new ReadableStream({
    async start(controller) {
      // Send initial progress if available
      const initial = await getLatestProgress(jobId);
      if (initial) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initial)}\n\n`)
        );
      }

      // Subscribe to real-time updates
      unsubscribe = await subscribeToProgress(jobId, (data) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );

          // Close stream when complete
          if (data.complete || data.error) {
            if (unsubscribe) unsubscribe();
            if (intervalId) clearInterval(intervalId);
            controller.close();
          }
        } catch (error) {
          console.error('Error sending progress:', error);
        }
      });

      // Also poll for updates in case Redis pub/sub misses any
      intervalId = setInterval(async () => {
        const latest = await getLatestProgress(jobId);
        if (latest) {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(latest)}\n\n`)
            );
          } catch {
            // Stream may be closed
          }
        }
      }, 2000);
    },

    cancel() {
      if (unsubscribe) unsubscribe();
      if (intervalId) clearInterval(intervalId);
    },
  });
}

/**
 * Format step status for display
 */
export function formatStepStatus(step: ProgressStep): string {
  const icons = {
    done: '✅',
    active: '🔄',
    waiting: '⏳',
  };

  const icon = icons[step.status];
  const detail = step.detail ? ` (${step.detail})` : '';
  const statusText = step.status === 'done' ? 'done' : step.status;

  return `${icon} ${step.label}${detail} ${statusText}`;
}

/**
 * Calculate overall progress from steps
 */
export function calculateProgress(steps: ProgressStep[]): number {
  const completed = steps.filter(s => s.status === 'done').length;
  const active = steps.filter(s => s.status === 'active').length;
  
  // Active step counts as half
  const progress = (completed + active * 0.5) / steps.length;
  
  return Math.round(progress * 100);
}
