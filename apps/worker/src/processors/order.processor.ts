import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '@app/database';
import {
  NOTIFICATION_QUEUE,
  ORDER_QUEUE,
  NotificationJobName,
  type OrderStatusNotificationPayload,
  type ProcessOrderJobPayload,
} from '@app/domain';

@Processor(ORDER_QUEUE, { concurrency: 5 })
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue<OrderStatusNotificationPayload>,
  ) {
    super();
  }

  async process(
    job: Job<ProcessOrderJobPayload, unknown, string>,
  ): Promise<void> {
    const { orderId } = job.data;
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      this.logger.warn(`Order ${orderId} missing, skip`);
      return;
    }
    if (order.status !== 'pending') {
      return;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'processing' },
    });
    await this.dispatchNotification({
      orderId,
      status: 'processing',
      previousStatus: 'pending',
      customerEmail: order.customerEmail ?? undefined,
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'completed' },
    });
    await this.dispatchNotification({
      orderId,
      status: 'completed',
      previousStatus: 'processing',
      customerEmail: order.customerEmail ?? undefined,
    });

    this.logger.log(`Order ${orderId} completed`);
  }

  private async dispatchNotification(
    payload: OrderStatusNotificationPayload,
  ): Promise<void> {
    await this.notificationQueue.add(
      NotificationJobName.OrderStatusChanged,
      payload,
      {
        attempts: 3,
        backoff: { type: 'fixed', delay: 500 },
        removeOnComplete: true,
      },
    );
  }
}
