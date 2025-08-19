import { Global, Injectable } from '@nestjs/common';
import * as NodeCache from 'node-cache';

@Global()
@Injectable()
export class CacheService {
  private cache: NodeCache;
  constructor() {
    this.cache = new NodeCache({ stdTTL: 21600 });
  }

  set(key: string, value: any, ttl = 21600) {
    this.cache.set(key, value, ttl);
  }

  get(key: string) {
    return this.cache.get(key);
  }
  delete(key: string): void {
    this.cache.del(key);
  }
}
