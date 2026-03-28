import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Prisma, type OrderStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '@app/database';
import {
  ORDER_QUEUE,
  OrderJobName,
  type ProcessOrderJobPayload,
} from '@app/domain';
import { CreateOrderDto } from './dto/create-order.dto';

type OrderLineSnapshot = {
  productId: string;
  quantity: number;
  priceSnapshot: Prisma.Decimal;
};

export type OrderAcceptedResponse = {
  accepted: true;
  idempotentReplay: boolean;
  orderId: string;
  status: OrderStatus;
  statusUrl: string;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(ORDER_QUEUE)
    private readonly orderQueue: Queue<ProcessOrderJobPayload>,
  ) {}

  async create(
    dto: CreateOrderDto,
    idempotencyKey: string,
  ): Promise<OrderAcceptedResponse> {
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return this.toAcceptedResponse(existing, true);
    }

    try {
      const orderId = await this.placeOrderInTransaction(dto, idempotencyKey);
      await this.enqueueOrderProcessing(orderId);
      return this.toAcceptedResponse(
        { id: orderId, status: 'pending' },
        false,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const row = await this.prisma.order.findUnique({
          where: { idempotencyKey },
        });
        if (row) {
          return this.toAcceptedResponse(row, true);
        }
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }

  private toAcceptedResponse(
    row: { id: string; status: OrderStatus },
    idempotentReplay: boolean,
  ): OrderAcceptedResponse {
    return {
      accepted: true,
      idempotentReplay,
      orderId: row.id,
      status: row.status,
      statusUrl: `/orders/${row.id}`,
    };
  }

  private async placeOrderInTransaction(
    dto: CreateOrderDto,
    idempotencyKey: string,
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      let total = new Prisma.Decimal(0);
      const lines: OrderLineSnapshot[] = [];

      for (const line of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });
        if (!product) {
          throw new NotFoundException(`Product ${line.productId} not found`);
        }
        if (product.stock < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${line.productId}`,
          );
        }
        const reserved = await tx.product.updateMany({
          where: {
            id: line.productId,
            version: product.version,
            stock: { gte: line.quantity },
          },
          data: {
            stock: { decrement: line.quantity },
            version: { increment: 1 },
          },
        });
        if (reserved.count === 0) {
          throw new ConflictException(
            `Concurrent update for product ${line.productId}, retry`,
          );
        }
        total = total.add(product.price.mul(line.quantity));
        lines.push({
          productId: line.productId,
          quantity: line.quantity,
          priceSnapshot: product.price,
        });
      }

      const order = await tx.order.create({
        data: {
          idempotencyKey,
          customerEmail: dto.customerEmail,
          total,
          status: 'pending',
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              priceSnapshot: l.priceSnapshot,
            })),
          },
        },
      });
      return order.id;
    });
  }

  private async enqueueOrderProcessing(orderId: string): Promise<void> {
    await this.orderQueue.add(
      OrderJobName.ProcessOrder,
      { orderId },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        jobId: `process-order-${orderId}`,
      },
    );
  }
}
