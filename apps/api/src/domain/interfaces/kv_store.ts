export interface IKeyValueStore {
  get: <T = unknown>(key: string) => Promise<T | null>;
  set: (
    key: string,
    value: unknown,
    options?: {
      ttl_seconds?: number;
    },
  ) => Promise<void>;
  delete: (key: string) => Promise<void>;
  increment: (key: string, amount?: number) => Promise<number>;
  destroy: () => Promise<void>;
}
