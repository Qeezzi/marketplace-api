import { Injectable, Logger } from '@nestjs/common';
import type { OrderStatusNotificationPayload } from '@app/domain';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendOrderStatusChange(
    payload: OrderStatusNotificationPayload,
  ): Promise<void> {
    const email = payload.customerEmail
      ? ` recipient=${payload.customerEmail}`
      : '';
    this.logger.log(
      `Order ${payload.orderId} ${payload.previousStatus ?? '—'} → ${payload.status}${email}`,
    );
  }
}
