import { clock, type Clock } from "@/lib/clock";

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPrefix(prefix: string): Promise<void>;
}

type Entry = { value: string; expiresAt: number };

export class MemoryCacheStore implements CacheStore {
  private store = new Map<string, Entry>();

  constructor(private readonly clockImpl: Clock = clock) {}

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.clockImpl.now().getTime()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: this.clockImpl.now().getTime() + ttlMs,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

const backend = process.env.CACHE_BACKEND ?? "memory";

export const cacheStore: CacheStore =
  backend === "memory" ? new MemoryCacheStore() : new MemoryCacheStore();
