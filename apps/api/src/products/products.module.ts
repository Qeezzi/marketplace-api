import { Module } from '@nestjs/common';
import { ProductCacheService } from '../cache/product-cache.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductCacheService],
})
export class ProductsModule {}
