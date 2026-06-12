import type { CachedValue, RetrievalCache } from "./types";

type CacheRecord<T> = {
  value: T;
  fetchedAt: Date;
  expiresAt: Date;
};

type MemoryRetrievalCacheOptions = {
  now?: () => Date;
};

export class MemoryRetrievalCache implements RetrievalCache {
  private readonly records = new Map<string, CacheRecord<unknown>>();
  private readonly now: () => Date;

  constructor(options: MemoryRetrievalCacheOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  get<T>(key: string): CachedValue<T> | null {
    const record = this.records.get(key) as CacheRecord<T> | undefined;
    if (!record || record.expiresAt <= this.now()) {
      return null;
    }

    return {
      value: record.value,
      fetchedAt: record.fetchedAt.toISOString(),
      expiresAt: record.expiresAt.toISOString(),
      cacheStatus: "cached",
    };
  }

  set<T>(key: string, value: T, expiresAt: Date) {
    this.records.set(key, {
      value,
      fetchedAt: this.now(),
      expiresAt,
    });
  }
}
