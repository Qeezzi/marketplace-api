import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ORDER_QUEUE } from '@app/domain';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: ORDER_QUEUE,
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
