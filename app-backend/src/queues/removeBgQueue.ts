// app-backend/src/queues/removeBgQueue.ts
import { Queue } from "bullmq";

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

console.log(
  `[removeBgQueue] Using Redis ${connection.host}:${connection.port}`
);

export const removeBgQueue = new Queue("remove-bg", {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 1,
  },
});
