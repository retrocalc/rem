import { CacheConfig } from '../../config/app.config';
import { logger } from '../logging/logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private redisClient: any = null;

  constructor(private config: CacheConfig) {
    if (config.enabled && config.redis) {
      this.initializeRedis();
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      const { createClient } = await import('redis');
      this.redisClient = createClient({
        url: `redis://${this.config.redis!.host}:${this.config.redis!.port}`,
        password: this.config.redis!.password
      });

      this.redisClient.on('error', (err: Error) => {
        logger.error('Redis connection error:', err);
      });

      await this.redisClient.connect();
      logger.info('Redis cache initialized');
    } catch (error: any) {
      logger.warn('Failed to initialize Redis, falling back to memory cache:', {
        error: error.message
      });
      this.redisClient = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      // Intentar Redis primero si está disponible
      if (this.redisClient) {
        const cached = await this.redisClient.get(key);
        if (cached) {
          logger.debug(`Cache hit (Redis): ${key}`);
          return JSON.parse(cached);
        }
      }

      // Fallback a memoria
      const entry = this.memoryCache.get(key);
      if (entry && entry.expiresAt > Date.now()) {
        logger.debug(`Cache hit (Memory): ${key}`);
        return entry.data;
      }

      // Limpiar entrada expirada
      if (entry && entry.expiresAt <= Date.now()) {
        this.memoryCache.delete(key);
      }

      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error: any) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const expiresAt = Date.now() + (ttl || this.config.ttl) * 1000;

    try {
      // Almacenar en Redis si está disponible
      if (this.redisClient) {
        await this.redisClient.set(
          key,
          JSON.stringify(data),
          { EX: ttl || this.config.ttl }
        );
      }

      // También almacenar en memoria como fallback
      this.memoryCache.set(key, { data, expiresAt });
      
      logger.debug(`Cache set: ${key} (TTL: ${ttl || this.config.ttl}s)`);
    } catch (error: any) {
      logger.error('Cache set error:', { key, error: error.message });
      // Fallback solo a memoria
      this.memoryCache.set(key, { data, expiresAt });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.del(key);
      }
      this.memoryCache.delete(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error: any) {
      logger.error('Cache delete error:', { key, error: error.message });
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.flushAll();
      }
      this.memoryCache.clear();
      logger.debug('Cache cleared');
    } catch (error: any) {
      logger.error('Cache clear error:', { error: error.message });
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          logger.debug(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
        }
      }

      // Para memoria, limpiar manualmente
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error: any) {
      logger.error('Cache invalidate pattern error:', { pattern, error: error.message });
    }
  }

  async withCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }

  getStats(): {
    memorySize: number;
    redisEnabled: boolean;
    enabled: boolean;
  } {
    return {
      memorySize: this.memoryCache.size,
      redisEnabled: this.redisClient !== null,
      enabled: this.config.enabled
    };
  }

  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}