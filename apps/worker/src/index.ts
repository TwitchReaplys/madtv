import { processJob } from "./jobs.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { assertRedisConnection, createQueueWorker, redis } from "./queue.js";
import { supabase } from "./supabase.js";

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

let heartbeatTimer: NodeJS.Timeout | null = null;

async function writeHeartbeat() {
  const { error } = await supabase.from("service_status").upsert(
    {
      service_name: env.workerServiceName,
      last_seen_at: new Date().toISOString(),
      meta: {
        pid: process.pid,
      },
    },
    {
      onConflict: "service_name",
    },
  );

  if (error) {
    logger.error({ error: error.message }, "Failed to write worker heartbeat");
  }
}

async function bootstrap() {
  try {
    await assertRedisConnection();
    logger.info({ redisStatus: redis.status }, "Redis connection check passed");
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error), redisStatus: redis.status },
      "Worker startup failed: Redis is not reachable",
    );
    process.exit(1);
  }

  await writeHeartbeat();
  heartbeatTimer = setInterval(() => {
    void writeHeartbeat();
  }, 60_000);
}

void bootstrap();

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down worker");

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  await worker.close();
  await redis.quit();

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
