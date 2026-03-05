export const QUEUE_NAMES = {
  EVENTS: "events",
} as const;

export const JOB_NAMES = {
  STRIPE_EVENT: "stripe:event",
  BUNNY_SYNC: "bunny:sync",
  ANALYTICS_AGGREGATE: "analytics:aggregate",
  EMAIL_SEND: "email:send",
} as const;
