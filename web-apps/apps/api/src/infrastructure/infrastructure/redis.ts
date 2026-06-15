import { createClient } from "redis";
import { IKeyValueStore } from "../../domain/interfaces/kv_store";

// Keep existence check and expiry/write in one atomic Redis operation.
const upsertExpiringScript = `
if redis.call("EXISTS", KEYS[1]) == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[2])
  return "refreshed"
end

redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2])
return "created"
`;

export const RedisKeyValueStore = (redisUrl: string): IKeyValueStore => {
  const client = createClient({
    url: redisUrl,
  });
  let connectPromise: Promise<unknown> | undefined;

  const connect = async () => {
    if (!client.isOpen) {
      connectPromise ??= client.connect();
      await connectPromise;
    }
  };

  return {
    async get<T = unknown>(key: string) {
      await connect();
      const value = await client.get(key);

      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    },
    async set(key, value, options) {
      await connect();
      const serialized = JSON.stringify(value);

      if (options?.ttl_seconds) {
        await client.set(key, serialized, { EX: options.ttl_seconds });
        return;
      }

      await client.set(key, serialized);
    },
    async upsertExpiring(key, value, options) {
      await connect();
      const serialized = JSON.stringify(value);
      const result = await client.eval(upsertExpiringScript, {
        keys: [key],
        arguments: [serialized, String(options.ttl_seconds)],
      });

      return result === "created" ? "created" : "refreshed";
    },
    async delete(key) {
      await connect();
      await client.del(key);
    },
    async increment(key, amount = 1) {
      await connect();
      return client.incrBy(key, amount);
    },
    async destroy() {
      if (client.isOpen) {
        await client.quit();
      }
    },
  };
};
