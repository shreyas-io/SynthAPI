import type { IKeyValueStore } from "../../domain/interfaces/kv_store";

export const CloudflareKVStore = (kv: KVNamespace): IKeyValueStore => {
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      const value = await kv.get(key);
      if (value === null) {
        return null;
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    },

    async set(
      key: string,
      value: unknown,
      options?: { ttl_seconds?: number },
    ): Promise<void> {
      await kv.put(key, JSON.stringify(value), {
        expirationTtl: options?.ttl_seconds,
      });
    },

    async upsertExpiring(
      key: string,
      value: unknown,
      options: { ttl_seconds: number },
    ): Promise<"created" | "refreshed"> {
      const existing = await kv.get(key);
      await kv.put(key, JSON.stringify(value), {
        expirationTtl: options.ttl_seconds,
      });
      return existing === null ? "created" : "refreshed";
    },

    async delete(key: string): Promise<void> {
      await kv.delete(key);
    },

    async increment(key: string, amount = 1): Promise<number> {
      // KV has no atomic increment. This is best-effort; concurrent writes can
      // overwrite each other. Use Durable Objects if accurate counters matter.
      const current = Number((await kv.get(key)) ?? 0);
      const next = current + amount;
      await kv.put(key, String(next));
      return next;
    },

    async destroy(): Promise<void> {
      // KV is managed by Cloudflare; no teardown required.
    },
  };
};
