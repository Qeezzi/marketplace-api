export interface ProcessOrderJobPayload {
  orderId: string;
}

export interface OrderStatusNotificationPayload {
  orderId: string;
  status: string;
  previousStatus?: string;
  customerEmail?: string;
}
