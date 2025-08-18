// app-backend/src/workers/cluster.ts
import { fork, ChildProcess } from "child_process";
import { Queue } from "bullmq";

// Use Docker service name by default
const REDIS_HOST = process.env.REDIS_HOST || "redis";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);


const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
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

const queue = new Queue("remove-bg", { connection });

const MIN_PROCS = Number(process.env.MIN_WORKER_PROCESSES ?? 1);
const MAX_PROCS = Number(process.env.MAX_WORKER_PROCESSES ?? 6);
const PER_PROC_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY_PER_PROCESS ?? 1);
const SCALE_UP_AT = Number(process.env.SCALE_UP_WAITING_THRESHOLD ?? 4);
const SCALE_DOWN_AT = Number(process.env.SCALE_DOWN_WAITING_THRESHOLD ?? 1);
const POLL_MS = Number(process.env.SCALER_POLL_MS ?? 3000);

const children: ChildProcess[] = [];

function spawnOne() {
  const child = fork(require.resolve("./workerEntry.js"), [], {
    env: { ...process.env, WORKER_CONCURRENCY: String(PER_PROC_CONCURRENCY) },
  });
  child.on("exit", (code, sig) => {
    const idx = children.indexOf(child);
    if (idx >= 0) children.splice(idx, 1);
  });
  children.push(child);
}

function killOne() {
  const child = children.pop();
  if (!child) return;
  child.kill("SIGTERM");
}

async function reconcile() {
  try {
    const waiting = await queue.getWaitingCount();
    const delayed = await queue.getDelayedCount();     
    const active  = await queue.getActiveCount();

    const backlog = waiting + delayed;                 

    const target =
      backlog >= SCALE_UP_AT ? Math.min(children.length + 1, MAX_PROCS) :
      backlog <= SCALE_DOWN_AT ? Math.max(children.length - 1, MIN_PROCS) :
      children.length;

    while (children.length < Math.max(target, MIN_PROCS)) spawnOne();
    while (children.length > target) killOne();


  } catch (e) {
    console.error("[scaler] reconcile error:", e);
  } finally {
    setTimeout(reconcile, POLL_MS);
  }
}

async function waitForRedisOnce(): Promise<void> {
  try {
    await queue.getJobCounts();
    console.log("[scaler] Redis reachable.");
  } catch {
    console.log("[scaler] Waiting for Redis...");
    await new Promise((r) => setTimeout(r, 2000));
    return waitForRedisOnce();
  }
}

(async () => {
  await waitForRedisOnce();
  for (let i = 0; i < MIN_PROCS; i++) spawnOne();
  setTimeout(reconcile, POLL_MS);
})();
