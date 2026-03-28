export const ORDER_QUEUE = 'orders';
export const NOTIFICATION_QUEUE = 'notifications';

export enum OrderJobName {
  ProcessOrder = 'process-order',
}

export enum NotificationJobName {
  OrderStatusChanged = 'order-status-changed',
}
