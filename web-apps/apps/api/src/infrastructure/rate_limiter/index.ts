import Bottleneck from "bottleneck";
import Redis from "ioredis";

export interface IRateLimiter {
  checkLimit(projectId: string, reqPerSec: number): Promise<void>;
  destroy(): Promise<void>;
}

export const createRateLimiter = (redisUrl: string): IRateLimiter => {
  const connection = new Redis(redisUrl);
  const limiters = new Map<string, Bottleneck>();

  const getLimiter = (projectId: string, reqPerSec: number): Bottleneck => {
    let limiter = limiters.get(projectId);
    if (!limiter) {
      limiter = new Bottleneck({
        id: `project_limit_${projectId}`,
        datastore: "redis",
        clearDatastore: false,
        connection: connection as any,
        // Using minTime for simple rate limiting (e.g. 10 req/sec -> 100ms per req)
        // This ensures the rate limit is strictly enforced across the cluster.
        minTime: 1000 / reqPerSec,
        maxConcurrent: reqPerSec,
        strategy: Bottleneck.strategy.OVERFLOW,
        highWater: 0,
      });
      
      limiter.on("error", (err) => {
        // Ignore internal redis errors from bottleneck to prevent crashes
        console.error("Bottleneck Redis error:", err);
      });
      
      limiters.set(projectId, limiter);
    }
    return limiter;
  };

  return {
    async checkLimit(projectId: string, reqPerSec: number) {
      // If the project doesn't have a limit or it's misconfigured, allow
      if (!reqPerSec || reqPerSec <= 0) {
        return;
      }
      
      const limiter = getLimiter(projectId, reqPerSec);
      
      try {
        await limiter.schedule(() => Promise.resolve());
      } catch (err: any) {
        if (err instanceof Bottleneck.BottleneckError) {
          throw new Error("Rate limit exceeded");
        }
        throw err;
      }
    },
    async destroy() {
      for (const limiter of limiters.values()) {
        await limiter.disconnect();
      }
      connection.disconnect();
    },
  };
};
