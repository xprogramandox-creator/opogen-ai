import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const ratelimitRegistro = new Ratelimit({
  redis,
  prefix: "opogen:registro",
  limiter: Ratelimit.slidingWindow(7, "1 h"),
  analytics: true,
});

export const ratelimitLogin = new Ratelimit({
  redis,
  prefix: "opogen:login",
  limiter: Ratelimit.slidingWindow(7, "1 h"),
  analytics: true,
});

export const ratelimitRecuperacion = new Ratelimit({
  redis,
  prefix: "opogen:recuperacion",
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
});
