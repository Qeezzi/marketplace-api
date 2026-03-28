import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, ValidateNested } from 'class-validator';
import { OrderLineDto } from './order-line.dto';

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items: OrderLineDto[];

  @IsOptional()
  @IsEmail()
  customerEmail?: string;
}
