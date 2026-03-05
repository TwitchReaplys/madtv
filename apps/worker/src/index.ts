import { processJob } from "./jobs.js";
import { logger } from "./logger.js";
import { createQueueWorker, redis } from "./queue.js";

const worker = createQueueWorker(async (job) => {
  logger.info({ jobId: job.id, name: job.name, attemptsMade: job.attemptsMade }, "Processing job");

  await processJob(job);

  logger.info({ jobId: job.id, name: job.name }, "Job completed");
});

worker.on("failed", (job, error) => {
  logger.error(
    {
      jobId: job?.id,
      name: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    },
    "Job failed",
  );
});

worker.on("error", (error) => {
  logger.error({ error: error.message }, "Worker runtime error");
});

worker.on("ready", () => {
  logger.info("Worker is ready");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down worker");

  await worker.close();
  await redis.quit();

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
