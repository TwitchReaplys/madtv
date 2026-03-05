export const QUEUE_NAMES = {
  EVENTS: "events",
} as const;

export const JOB_NAMES = {
  STRIPE_EVENT: "stripe:event",
  BUNNY_SYNC: "bunny:sync",
  EMAIL_SEND: "email:send",
} as const;
