// app-backend/src/workers/removeBgWorker.ts
import { Worker, QueueEvents } from "bullmq";
import ClosetService from "../modules/closet/closet.service";

// shared connection options
const connection = {
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null as unknown as null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    return Math.min(times * 1000, 10_000);
  },
  reconnectOnError(err: Error) {
    const msg = err.message || "";
    if (msg.includes("READONLY") || msg.includes("ECONNRESET")) return 1;
    return false;
  },
};

// fallback concurrency to 1 if not set
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 1);

export const startRemoveBgWorker = () => {
  const processedJobs = new Set<string>();

  const worker = new Worker(
    "remove-bg",
    async (job) => {
      const jobId = job.id || "unknown";

      if (processedJobs.has(jobId)) {
        return { status: "skipped", reason: "already_processed" };
      }
      processedJobs.add(jobId);

      const { userId, filePath, category, layerCategory, extras } = job.data;

      try {
        const fs = require("fs");
        if (!fs.existsSync(filePath)) {
          return { status: "skipped", reason: "file_not_found" };
        }

        const saved = await ClosetService.processAndSaveImageFromPath({
          filePath,
          category,
          layerCategory,
          userId,
          extras,
        });

        return { id: saved.id, status: "completed" };
      } catch (error) {
        processedJobs.delete(jobId); // allow retry
        throw error;
      }
    },
    {
      connection,
      concurrency: CONCURRENCY,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  const events = new QueueEvents("remove-bg", { connection });
  events.on("failed", ({ jobId, failedReason }) =>
    console.error(`Job ${jobId} failed: ${failedReason}`)
  );
  worker.on("error", (err) => console.error("Worker error:", err));
};
