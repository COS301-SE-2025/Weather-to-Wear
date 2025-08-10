// src/queues/removeBgQueue.ts
import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null as unknown as null,
  enableReadyCheck: false
};

export const removeBgQueue = new Queue('remove-bg', { 
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 1 // Only attempt once to prevent duplicates
  }
});
