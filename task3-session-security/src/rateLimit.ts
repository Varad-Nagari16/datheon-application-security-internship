import type { Request, RequestHandler } from "express";

export interface SlidingWindowOptions {
  limit: number;
  windowMs: number;
  key: (request: Request) => string;
  now?: () => number;
  maxBuckets?: number;
}

interface Decision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtSeconds: number;
  retryAfterSeconds: number;
}

export class SlidingWindowCounter {
  private readonly events = new Map<string, number[]>();
  private operations = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxBuckets = 5000,
  ) {
    if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
      throw new Error("Sliding-window limit and window must be positive");
    }
    if (!Number.isInteger(maxBuckets) || maxBuckets < 1) {
      throw new Error("Sliding-window bucket limit must be positive");
    }
  }

  consume(key: string, now: number): Decision {
    const cutoff = now - this.windowMs;
    const previous = this.events.get(key);
    const current = (previous ?? []).filter((timestamp) => timestamp > cutoff);
    this.operations += 1;

    if (this.operations % 128 === 0) this.pruneExpired(cutoff);
    if (current.length >= this.limit) {
      const resetAt = current[0]! + this.windowMs;
      return {
        allowed: false,
        limit: this.limit,
        remaining: 0,
        resetAtSeconds: Math.ceil(resetAt / 1000),
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      };
    }

    if (!previous && this.events.size >= this.maxBuckets) this.evictOldestBucket();
    current.push(now);
    this.events.set(key, current);
    const resetAt = current[0]! + this.windowMs;
    return {
      allowed: true,
      limit: this.limit,
      remaining: Math.max(0, this.limit - current.length),
      resetAtSeconds: Math.ceil(resetAt / 1000),
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  private pruneExpired(cutoff: number): void {
    for (const [key, timestamps] of this.events) {
      const live = timestamps.filter((timestamp) => timestamp > cutoff);
      if (live.length === 0) this.events.delete(key);
      else this.events.set(key, live);
    }
  }

  private evictOldestBucket(): void {
    let oldestKey: string | undefined;
    let oldestEvent = Number.POSITIVE_INFINITY;
    for (const [key, timestamps] of this.events) {
      const first = timestamps[0] ?? 0;
      if (first < oldestEvent) {
        oldestEvent = first;
        oldestKey = key;
      }
    }
    if (oldestKey !== undefined) this.events.delete(oldestKey);
  }
}

export function createSlidingWindowLimiter(options: SlidingWindowOptions): RequestHandler {
  const counter = new SlidingWindowCounter(options.limit, options.windowMs, options.maxBuckets);
  const now = options.now ?? Date.now;

  return (request, response, next) => {
    const decision = counter.consume(options.key(request), now());
    response.setHeader("X-RateLimit-Limit", String(decision.limit));
    response.setHeader("X-RateLimit-Remaining", String(decision.remaining));
    response.setHeader("X-RateLimit-Reset", String(decision.resetAtSeconds));

    if (!decision.allowed) {
      response.setHeader("Retry-After", String(decision.retryAfterSeconds));
      response.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  };
}
