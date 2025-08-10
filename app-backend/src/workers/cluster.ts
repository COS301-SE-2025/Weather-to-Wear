// src/workers/cluster.ts - Simplified to single worker
import { startRemoveBgWorker } from './removeBgWorker';

console.log('Starting single worker process...');
startRemoveBgWorker();
