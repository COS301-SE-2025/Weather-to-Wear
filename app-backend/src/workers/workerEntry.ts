//app-backend/src/workers/workerEntry.ts
import { startRemoveBgWorker } from "./removeBgWorker";

console.log(
  `[worker-entry] starting worker PID=${process.pid}, WORKER_CONCURRENCY=${process.env.WORKER_CONCURRENCY}`
);

startRemoveBgWorker();