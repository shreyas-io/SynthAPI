export type KeyValueStoreSetOptions = {
  ttl_seconds?: number;
};

export type KeyValueStoreUpsertExpiringOptions = {
  ttl_seconds: number;
};

export type KeyValueStoreUpsertExpiringResult = "created" | "refreshed";

export type KeyValueStore = {
  get: <T = unknown>(key: string) => Promise<T | null>;
  set: (
    key: string,
    value: unknown,
    options?: KeyValueStoreSetOptions,
  ) => Promise<void>;
  upsertExpiring: (
    key: string,
    value: unknown,
    options: KeyValueStoreUpsertExpiringOptions,
  ) => Promise<KeyValueStoreUpsertExpiringResult>;
  delete: (key: string) => Promise<void>;
  increment: (key: string, amount?: number) => Promise<number>;
  destroy: () => Promise<void>;
};
