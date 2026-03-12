import { NextRequest } from 'next/server';

// Import job store from convert route
declare global {
  // eslint-disable-next-line no-var
  var jobStore: Map<string, JobData> | undefined;
}

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

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  const jobStore = global.jobStore;

  if (!jobStore) {
    return new Response(
      JSON.stringify({ error: 'Job store not initialized' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const job = jobStore.get(jobId);

  if (!job) {
    return new Response(
      JSON.stringify({ error: 'Job not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial state
      sendEvent({
        url: job.url,
        percentage: job.progress,
        steps: job.steps,
        sectionPreviews: [],
      });

      // Poll for updates
      const intervalId = setInterval(() => {
        const currentJob = jobStore.get(jobId);

        if (!currentJob) {
          sendEvent({ error: 'Job not found' });
          clearInterval(intervalId);
          controller.close();
          return;
        }

        if (currentJob.error) {
          sendEvent({ error: currentJob.error });
          clearInterval(intervalId);
          controller.close();
          return;
        }

        sendEvent({
          url: currentJob.url,
          percentage: currentJob.progress,
          steps: currentJob.steps,
          sectionPreviews: [],
        });

        if (currentJob.status === 'completed') {
          sendEvent({ complete: true });
          clearInterval(intervalId);
          controller.close();
        }
      }, 500);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
