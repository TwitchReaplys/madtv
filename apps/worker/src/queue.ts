import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

import { QUEUE_NAMES } from "@madtv/shared";
import { env } from "./env.js";

const redis = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

export async function assertRedisConnection() {
  const pong = await redis.ping();

  if (pong !== "PONG") {
    throw new Error(`Redis ping failed, expected PONG but got: ${pong}`);
  }
}

export const queue = new Queue(QUEUE_NAMES.EVENTS, {
  connection: redis,
  defaultJobOptions: {
    attempts: 8,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export function createQueueWorker(
  processor: ConstructorParameters<typeof Worker>[1],
) {
  return new Worker(QUEUE_NAMES.EVENTS, processor, {
    connection: redis,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 6),
  });
}

export { redis };
