// Shared types for ThemeForge

export interface StepStatus {
  id: string;
  label: string;
  status: 'done' | 'active' | 'waiting';
  detail?: string;
}

export interface JobData {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  steps: StepStatus[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Global declaration for job store
declare global {
  // eslint-disable-next-line no-var
  var jobStore: Map<string, JobData> | undefined;
}

// Helper function to get or initialize job store
export function getJobStore(): Map<string, JobData> {
  if (!global.jobStore) {
    global.jobStore = new Map<string, JobData>();
  }
  return global.jobStore;
}
