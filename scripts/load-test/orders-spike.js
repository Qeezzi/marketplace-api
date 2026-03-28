import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const productId = __ENV.PRODUCT_ID || '';

export default function () {
  if (!productId) {
    return;
  }
  const res = http.post(
    `${baseUrl}/orders`,
    JSON.stringify({
      items: [{ productId, quantity: 1 }],
      customerEmail: 'load@test.local',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `k6-${__VU}-${__ITER}-${Date.now()}`,
      },
    },
  );
  check(res, { '202': (r) => r.status === 202 });
  sleep(0.05);
}
