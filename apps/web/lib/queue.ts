import { Queue } from "bullmq";
import Redis from "ioredis";

import {
  JOB_NAMES,
  QUEUE_NAMES,
  analyticsAggregateJobSchema,
  bunnySyncJobSchema,
  stripeEventJobSchema,
} from "@madtv/shared";

const redisUrl = process.env.REDIS_URL;

const globalForQueue = globalThis as unknown as {
  redisConnection?: Redis;
  eventsQueue?: Queue;
};

function getRedisConnection() {
  if (!redisUrl) {
    throw new Error("Missing REDIS_URL");
  }

  if (globalForQueue.redisConnection) {
    return globalForQueue.redisConnection;
  }

  globalForQueue.redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  return globalForQueue.redisConnection;
}

function getEventsQueue() {
  if (globalForQueue.eventsQueue) {
    return globalForQueue.eventsQueue;
  }

  globalForQueue.eventsQueue = new Queue(QUEUE_NAMES.EVENTS, {
    connection: getRedisConnection(),
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

  return globalForQueue.eventsQueue;
}

export async function enqueueStripeEvent(eventId: string) {
  const payload = stripeEventJobSchema.parse({ eventId });

  await getEventsQueue().add(JOB_NAMES.STRIPE_EVENT, payload, {
    jobId: payload.eventId,
  });
}

export async function enqueueBunnySync(assetId: string, videoId: string, libraryId: string) {
  const payload = bunnySyncJobSchema.parse({
    assetId,
    videoId,
    libraryId,
  });

  await getEventsQueue().add(JOB_NAMES.BUNNY_SYNC, payload, {
    jobId: `bunny-sync:${payload.assetId}:${payload.videoId}`,
  });
}

export async function enqueueAnalyticsAggregate(creatorId: string, day: string) {
  const payload = analyticsAggregateJobSchema.parse({
    creatorId,
    day,
  });

  await getEventsQueue().add(JOB_NAMES.ANALYTICS_AGGREGATE, payload, {
    jobId: `analytics-aggregate:${payload.creatorId}:${payload.day}`,
  });
}
