export type KeyValueStoreSetOptions = {
  ttl_seconds?: number;
};

export type KeyValueStore = {
  get: <T = unknown>(key: string) => Promise<T | null>;
  set: (
    key: string,
    value: unknown,
    options?: KeyValueStoreSetOptions,
  ) => Promise<void>;
  delete: (key: string) => Promise<void>;
  increment: (key: string, amount?: number) => Promise<number>;
  destroy: () => Promise<void>;
};
