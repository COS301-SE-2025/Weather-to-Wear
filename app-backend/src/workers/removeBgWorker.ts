import { Worker, QueueEvents } from "bullmq";
import os from "os";
import path from "path";
import ClosetService from "../modules/closet/closet.service";

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null as unknown as null,
  enableReadyCheck: false,
};

const CONCURRENCY = Number(
  process.env.WORKER_CONCURRENCY || 1
);

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/app/uploads";

export const startRemoveBgWorker = () => {
  console.log(`🚀 Starting worker with concurrency: ${CONCURRENCY}`);
  
  // Track processed jobs to prevent duplicates
  const processedJobs = new Set<string>();
  
  const worker = new Worker(
    "remove-bg",
    async (job) => {
      const jobId = job.id || 'unknown';
      console.log(`🔄 Processing job ${jobId}:`, job.data);
      console.log(`📁 Job ${jobId} file path: ${job.data.filePath}`);

      // Check if this job has already been processed
      if (processedJobs.has(jobId)) {
        console.log(`⚠️ Job ${jobId} already processed, skipping`);
        return { status: 'skipped', reason: 'already_processed' };
      }
      processedJobs.add(jobId);

      const { userId, filePath, category, layerCategory, extras } = job.data;

      try {
        // Check if file still exists before processing
        const fs = require('fs');
        console.log(`🔍 Checking if file exists: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
          console.log(`⚠️ File ${filePath} no longer exists, skipping job ${jobId}`);
          return { status: 'skipped', reason: 'file_not_found' };
        }

        console.log(`✅ File ${filePath} exists, proceeding with processing`);

        // Use the filePath directly from the job data
        const saved = await ClosetService.processAndSaveImageFromPath({
          filePath,
          category,
          layerCategory,
          userId,
          extras,
        });

        console.log(`✅ Job ${jobId} completed successfully for file ${filePath}`);
        return { id: saved.id, status: 'completed' };
      } catch (error) {
        console.error(`❌ Job ${jobId} failed:`, error);
        // Remove from processed set on failure so it can be retried
        processedJobs.delete(jobId);
        throw error; // Re-throw to mark job as failed
      }
    },
    { 
      connection, 
      concurrency: CONCURRENCY,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 }
    }
  );

  const events = new QueueEvents("remove-bg", { connection });
  events.on("completed", ({ jobId }) => console.log(`✅ Job ${jobId} completed`));
  events.on("failed", ({ jobId, failedReason }) =>
    console.error(`❌ Job ${jobId} failed: ${failedReason}`)
  );
  worker.on("error", (err) => console.error("Worker error:", err));
  
  console.log(`✅ Worker started successfully`);
};
