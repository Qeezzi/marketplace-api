import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

const TTL_PRODUCT_SEC = 120;
const TTL_LIST_SEC = 30;
const KEY_PRODUCT = (id: string) => `product:${id}`;
const KEY_LIST = 'products:list';

export interface CachedProduct {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  version: number;
}

@Injectable()
export class ProductCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getProduct(id: string): Promise<CachedProduct | null> {
    const raw = await this.redis.get(KEY_PRODUCT(id));
    if (!raw) return null;
    return JSON.parse(raw) as CachedProduct;
  }

  async setProduct(product: CachedProduct): Promise<void> {
    await this.redis.setex(
      KEY_PRODUCT(product.id),
      TTL_PRODUCT_SEC,
      JSON.stringify(product),
    );
  }

  async invalidateProduct(id: string): Promise<void> {
    await this.redis.del(KEY_PRODUCT(id));
  }

  async getList(): Promise<CachedProduct[] | null> {
    const raw = await this.redis.get(KEY_LIST);
    if (!raw) return null;
    return JSON.parse(raw) as CachedProduct[];
  }

  async setList(products: CachedProduct[]): Promise<void> {
    await this.redis.setex(KEY_LIST, TTL_LIST_SEC, JSON.stringify(products));
  }

  async invalidateList(): Promise<void> {
    await this.redis.del(KEY_LIST);
  }
}
