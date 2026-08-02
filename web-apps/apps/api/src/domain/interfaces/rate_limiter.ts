export type TokenBucketRateLimiterConfig = {
  bucketSize: number;
  refillRate: number;
};

export interface ITokenBucketRateLimiter {
  execute<T>(key: string, fn: () => Promise<T>): Promise<T>;
}
