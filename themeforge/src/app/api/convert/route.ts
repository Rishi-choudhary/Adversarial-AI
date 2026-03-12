import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Types for job management
interface JobData {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  steps: StepStatus[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

interface StepStatus {
  id: string;
  label: string;
  status: 'done' | 'active' | 'waiting';
  detail?: string;
}

// In-memory job storage (in production, use Redis)
declare global {
  // eslint-disable-next-line no-var
  var jobStore: Map<string, JobData> | undefined;
}

if (!global.jobStore) {
  global.jobStore = new Map<string, JobData>();
}

const jobStore = global.jobStore;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create job ID
    const jobId = uuidv4();

    // Initialize job data
    const initialSteps: StepStatus[] = [
      { id: 'scrape', label: 'Scraping website...', status: 'waiting' },
      { id: 'images', label: 'Extracting images...', status: 'waiting' },
      { id: 'css', label: 'Extracting CSS & JS...', status: 'waiting' },
      { id: 'detect', label: 'Detecting sections...', status: 'waiting' },
      { id: 'convert', label: 'Converting sections to Liquid...', status: 'waiting' },
      { id: 'assemble', label: 'Assembling Shopify theme...', status: 'waiting' },
      { id: 'zip', label: 'Generating ZIP...', status: 'waiting' },
    ];

    const jobData: JobData = {
      id: jobId,
      url,
      status: 'pending',
      progress: 0,
      steps: initialSteps,
      createdAt: new Date(),
    };

    // Store job
    jobStore.set(jobId, jobData);

    // In production, this would add the job to BullMQ queue
    // For now, we'll simulate the processing
    simulateJobProcessing(jobId);

    return NextResponse.json({ jobId }, { status: 201 });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simulate job processing (in production, this would be handled by the worker)
async function simulateJobProcessing(jobId: string) {
  const job = jobStore.get(jobId);
  if (!job) return;

  const steps = [
    { id: 'scrape', delay: 2000, progress: 15 },
    { id: 'images', delay: 3000, progress: 30, detail: '47 images' },
    { id: 'css', delay: 2000, progress: 45 },
    { id: 'detect', delay: 2500, progress: 55, detail: '8 sections' },
    { id: 'convert', delay: 4000, progress: 75, detail: '5/8' },
    { id: 'assemble', delay: 2000, progress: 90 },
    { id: 'zip', delay: 1500, progress: 100 },
  ];

  job.status = 'processing';

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    // Mark current step as active
    job.steps = job.steps.map((s, idx) => ({
      ...s,
      status: idx < i ? 'done' : idx === i ? 'active' : 'waiting',
      detail: idx === i && step.detail ? step.detail : s.detail,
    }));

    await new Promise(resolve => setTimeout(resolve, step.delay));

    // Mark step as done
    job.steps = job.steps.map((s, idx) => ({
      ...s,
      status: idx <= i ? 'done' : idx === i + 1 ? 'active' : 'waiting',
    }));
    
    job.progress = step.progress;
    jobStore.set(jobId, { ...job });
  }

  // Mark job as completed
  job.status = 'completed';
  job.completedAt = new Date();
  jobStore.set(jobId, { ...job });
}

export { jobStore };
