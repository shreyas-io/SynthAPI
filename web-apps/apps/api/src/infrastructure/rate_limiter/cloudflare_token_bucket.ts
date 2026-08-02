import {
  ApiGatewayException,
  HttpStatusCode,
} from "../../domain/exceptions/exception";
import {
  ITokenBucketRateLimiter,
  TokenBucketRateLimiterConfig,
} from "../../domain/interfaces/rate_limiter";

export type RateLimiterConsumeRequest = {
  bucketSize: number;
  refillRate: number;
  cost?: number;
};

export type RateLimiterConsumeResponse = {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
};

type BucketState = {
  tokens: number;
  lastRefillAt: number;
};

export class RateLimiterDO {
  constructor(
    private readonly state: DurableObjectState,
    private readonly _env: unknown,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const body = (await request.json()) as RateLimiterConsumeRequest;
    const { bucketSize, refillRate, cost = 1 } = body;
    const now = Date.now();

    const stored = await this.state.storage.get<BucketState>("bucket");
    const bucket = stored ?? { tokens: bucketSize, lastRefillAt: now };

    this.refill(bucket, now, bucketSize, refillRate);

    if (bucket.tokens < cost) {
      await this.state.storage.put("bucket", bucket);
      const retryAfter = Math.ceil((cost - bucket.tokens) / refillRate);
      return Response.json({
        allowed: false,
        remaining: Math.floor(bucket.tokens),
        retryAfter,
      } as RateLimiterConsumeResponse);
    }

    bucket.tokens -= cost;
    await this.state.storage.put("bucket", bucket);
    return Response.json({
      allowed: true,
      remaining: Math.floor(bucket.tokens),
    } as RateLimiterConsumeResponse);
  }

  private refill(
    bucket: BucketState,
    now: number,
    bucketSize: number,
    refillRate: number,
  ): void {
    const elapsedSeconds = (now - bucket.lastRefillAt) / 1000;
    if (elapsedSeconds <= 0) {
      return;
    }

    bucket.tokens = Math.min(
      bucketSize,
      bucket.tokens + elapsedSeconds * refillRate,
    );
    bucket.lastRefillAt = now;
  }
}

export class CloudflareTokenRateLimiter implements ITokenBucketRateLimiter {
  constructor(
    private readonly namespace: DurableObjectNamespace,
    private readonly config: TokenBucketRateLimiterConfig,
  ) {}

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const id = this.namespace.idFromName(key);
    const stub = this.namespace.get(id);

    const response = await stub.fetch("http://rate-limiter/consume", {
      method: "POST",
      body: JSON.stringify({
        bucketSize: this.config.bucketSize,
        refillRate: this.config.refillRate,
        cost: 1,
      }),
    });

    if (!response.ok) {
      throw new ApiGatewayException({
        public_message: "Rate limit check failed.",
        status_code: HttpStatusCode.INTERNAL_SERVER_ERROR,
      });
    }

    const result = (await response.json()) as RateLimiterConsumeResponse;

    if (!result.allowed) {
      throw new ApiGatewayException({
        public_message: "Rate limit exceeded. Please try again later.",
        status_code: HttpStatusCode.TOO_MANY_REQUESTS,
        cause: { key, retryAfter: result.retryAfter },
      });
    }

    return fn();
  }
}
