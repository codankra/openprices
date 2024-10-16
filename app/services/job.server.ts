import { EventEmitter } from "events";

const jobEventEmitter = new EventEmitter();

const jobStore = new Map<string, { userId: string }>(); // Runtime Permissioned Jobs in Memory.
// If we start to have more jobs, they might deserve to be a full table.

export function createJob(jobId: string, userId: string) {
  jobStore.set(jobId, { userId });
}

export function getJobMetadata(jobId: string) {
  return jobStore.get(jobId);
}

export function removeJob(jobId: string) {
  jobStore.delete(jobId);
}

export const emitJobUpdate = (jobId: string, message: string) => {
  jobEventEmitter.emit("job-update", `job-${jobId}:${message}`);
};

export { jobEventEmitter };
