import Redis from "ioredis";

const globalForRateLimit = globalThis as unknown as {
  redis?: Redis;
};

function getRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (globalForRateLimit.redis) {
    return globalForRateLimit.redis;
  }

  globalForRateLimit.redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  return globalForRateLimit.redis;
}

export async function checkRateLimit(options: {
  key: string;
  limit: number;
  windowSeconds: number;
}) {
  const redis = getRedisClient();
  if (!redis) {
    return {
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
    };
  }

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }

    const count = await redis.incr(options.key);
    if (count === 1) {
      await redis.expire(options.key, options.windowSeconds);
    }

    return {
      allowed: count <= options.limit,
      remaining: Math.max(0, options.limit - count),
    };
  } catch {
    // Fail open to avoid blocking production traffic on temporary Redis issues.
    return {
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
    };
  }
}
