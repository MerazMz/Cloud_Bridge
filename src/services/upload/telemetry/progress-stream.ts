import { EventEmitter } from "events";

export interface UploadProgressEvent {
  jobId: string;
  status: string;
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  speed: string;
  eta: string;
  errorMessage?: string | null;
}

class ProgressBroadcaster {
  private emitter = new EventEmitter();

  constructor() {
    // Max listeners set to high limit to prevent warnings
    this.emitter.setMaxListeners(1000);
  }

  /**
   * Broadcast real-time upload progress for a specific job.
   */
  broadcast(jobId: string, event: UploadProgressEvent) {
    this.emitter.emit(`progress:${jobId}`, event);
  }

  /**
   * Subscribe to real-time progress for a specific job.
   * Returns a cleanup function to unsubscribe.
   */
  subscribe(jobId: string, callback: (event: UploadProgressEvent) => void): () => void {
    const eventName = `progress:${jobId}`;
    this.emitter.on(eventName, callback);
    return () => {
      this.emitter.off(eventName, callback);
    };
  }
}

// Define global interface for typescript
declare global {
  var progressBroadcaster: ProgressBroadcaster | undefined;
}

// Global Singleton progress broadcaster using globalThis pattern to avoid duplication in Next.js dev server
export const progressBroadcaster = globalThis.progressBroadcaster || new ProgressBroadcaster();

if (process.env.NODE_ENV !== "production") {
  globalThis.progressBroadcaster = progressBroadcaster;
}
