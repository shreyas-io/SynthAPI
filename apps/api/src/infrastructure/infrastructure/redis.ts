import { createClient } from "redis";
import { IKeyValueStore } from "../../domain/interfaces/kv_store";

export const RedisKeyValueStore = (creds: {
  redis_host: string;
  redis_port: number;
  redis_pass: string;
}): IKeyValueStore => {
  const connUrl = new URL(`redis://${creds.redis_host}`);
  connUrl.port = String(creds.redis_port);
  connUrl.password = encodeURIComponent(creds.redis_pass);
  const url = connUrl.toString();

  const client = createClient({
    url,
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
