import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { validateWorkerEnv } from '@app/config';
import { PrismaModule } from '@app/database';
import { NOTIFICATION_QUEUE, ORDER_QUEUE } from '@app/domain';
import { NotificationService } from './notifications/notification.service';
import { OrderProcessor } from './processors/order.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateWorkerEnv,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: config.getOrThrow<number>('REDIS_PORT'),
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: ORDER_QUEUE },
      { name: NOTIFICATION_QUEUE },
    ),
    PrismaModule,
  ],
  providers: [OrderProcessor, NotificationProcessor, NotificationService],
})
export class WorkerModule {}
