import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import {
  ProductCacheService,
  type CachedProduct,
} from '../cache/product-cache.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: Prisma.Decimal;
  stock: number;
  version: number;
};

function toCachedDto(row: ProductRow): CachedProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price.toFixed(2),
    stock: row.stock,
    version: row.version,
  };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: ProductCacheService,
  ) {}

  async findAll(): Promise<CachedProduct[]> {
    const cached = await this.cache.getList();
    if (cached) {
      return cached;
    }
    const rows = await this.prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
    const result = rows.map(toCachedDto);
    await this.cache.setList(result);
    return result;
  }

  async findOne(id: string): Promise<CachedProduct> {
    const cached = await this.cache.getProduct(id);
    if (cached) {
      return cached;
    }
    const row = await this.prisma.product.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    const dto = toCachedDto(row);
    await this.cache.setProduct(dto);
    return dto;
  }

  async create(dto: CreateProductDto): Promise<CachedProduct> {
    const created = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: new Prisma.Decimal(dto.price),
        stock: dto.stock,
      },
    });
    const snapshot = toCachedDto(created);
    await this.cache.setProduct(snapshot);
    await this.cache.invalidateList();
    return snapshot;
  }

  async update(id: string, dto: UpdateProductDto): Promise<CachedProduct> {
    try {
      const updated = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.price !== undefined && {
            price: new Prisma.Decimal(dto.price),
          }),
          ...(dto.stock !== undefined && { stock: dto.stock }),
        },
      });
      const snapshot = toCachedDto(updated);
      await this.cache.setProduct(snapshot);
      await this.cache.invalidateList();
      return snapshot;
    } catch {
      throw new NotFoundException(`Product ${id} not found`);
    }
  }
}
