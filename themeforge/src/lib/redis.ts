import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });
  }

  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// Job data helpers
export interface JobData {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  steps: StepStatus[];
  createdAt: string;
  completedAt?: string;
  error?: string;
  outputPath?: string;
}

export interface StepStatus {
  id: string;
  label: string;
  status: 'done' | 'active' | 'waiting';
  detail?: string;
}

export async function getJob(jobId: string): Promise<JobData | null> {
  const redis = getRedis();
  const data = await redis.get(`job:${jobId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function setJob(jobId: string, data: JobData): Promise<void> {
  const redis = getRedis();
  const ttl = parseInt(process.env.JOB_TTL_HOURS || '24', 10) * 3600;
  await redis.setex(`job:${jobId}`, ttl, JSON.stringify(data));
}

export async function updateJobProgress(
  jobId: string,
  progress: number,
  steps: StepStatus[]
): Promise<void> {
  const job = await getJob(jobId);
  if (job) {
    job.progress = progress;
    job.steps = steps;
    await setJob(jobId, job);
  }
}

export async function completeJob(jobId: string, outputPath: string): Promise<void> {
  const job = await getJob(jobId);
  if (job) {
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    job.outputPath = outputPath;
    await setJob(jobId, job);
  }
}

export async function failJob(jobId: string, error: string): Promise<void> {
  const job = await getJob(jobId);
  if (job) {
    job.status = 'failed';
    job.error = error;
    await setJob(jobId, job);
  }
}
