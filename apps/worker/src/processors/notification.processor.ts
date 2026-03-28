import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NOTIFICATION_QUEUE, type OrderStatusNotificationPayload } from '@app/domain';
import { NotificationService } from '../notifications/notification.service';

@Processor(NOTIFICATION_QUEUE, { concurrency: 10 })
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly notifications: NotificationService) {
    super();
  }

  async process(
    job: Job<OrderStatusNotificationPayload, unknown, string>,
  ): Promise<void> {
    await this.notifications.sendOrderStatusChange(job.data);
  }
}
