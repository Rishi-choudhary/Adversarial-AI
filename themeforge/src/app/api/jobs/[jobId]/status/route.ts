import { NextRequest } from 'next/server';
import { getJobStore } from '@/lib/jobStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const jobStore = getJobStore();

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
