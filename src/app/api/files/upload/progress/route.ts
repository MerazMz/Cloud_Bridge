import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { progressBroadcaster } from "@/services/upload/telemetry/progress-stream";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:files:upload:progress");

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return new Response(
      JSON.stringify({ success: false, message: "Missing jobId parameter." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // 1. Authenticate user session
    const userId = await getCurrentUserId();
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Validate that the job exists and belongs to this user
    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return new Response(
        JSON.stringify({ success: false, message: "Job not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (job.userId !== userId) {
      return new Response(
        JSON.stringify({ success: false, message: "Access denied." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Create real-time Server-Sent Events (SSE) stream response
    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        // Helper to push formatted SSE packets
        const pushEvent = (type: string, data: any) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
            );
          } catch (err) {
            log.error("Failed to enqueue progress event", err);
          }
        };

        // If the job is already completed or failed in database, emit final state and exit
        if (job.status === "completed") {
          pushEvent("success", {
            percent: 100,
            uploadedBytes: Number(job.fileSize),
            totalBytes: Number(job.fileSize),
            speed: "0 KB/s",
            eta: "0s",
          });
          controller.close();
          return;
        } else if (job.status === "failed") {
          pushEvent("error", { message: job.errorMessage || "Upload failed." });
          controller.close();
          return;
        } else if (job.status === "cancelled") {
          pushEvent("cancelled", {});
          controller.close();
          return;
        }

        // Send initial progress start state
        pushEvent("progress", {
          percent: job.progress,
          uploadedBytes: Number(job.uploadedBytes),
          totalBytes: Number(job.fileSize),
          speed: "0 KB/s",
          eta: "--",
        });

        // Subscribe to live events broadcasted by progress-stream singleton
        unsubscribe = progressBroadcaster.subscribe(jobId, (event) => {
          if (event.status === "processing") {
            pushEvent("progress", {
              percent: event.percent,
              uploadedBytes: event.uploadedBytes,
              totalBytes: Number(job.fileSize),
              speed: event.speed,
              eta: event.eta,
            });
          } else if (event.status === "completed") {
            pushEvent("success", {
              percent: 100,
              uploadedBytes: Number(job.fileSize),
              totalBytes: Number(job.fileSize),
              speed: "0 KB/s",
              eta: "0s",
            });
            cleanupAndClose();
          } else if (event.status === "failed") {
            pushEvent("error", { message: event.errorMessage || "Upload failed." });
            cleanupAndClose();
          } else if (event.status === "cancelled") {
            pushEvent("cancelled", {});
            cleanupAndClose();
          }
        });

        function cleanupAndClose() {
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
          try {
            controller.close();
          } catch {}
        }
      },
      cancel() {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    log.error("Failed to construct SSE stream", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "SSE stream failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
