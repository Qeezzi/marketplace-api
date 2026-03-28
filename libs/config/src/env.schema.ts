import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
});

export const apiEnvSchema = baseEnvSchema.extend({
  API_PORT: z.coerce.number().default(3000),
});

export const workerEnvSchema = baseEnvSchema;

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function validateApiEnv(record: Record<string, unknown>): ApiEnv {
  const result = apiEnvSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Invalid environment: ${result.error.message}`);
  }
  return result.data;
}

export function validateWorkerEnv(record: Record<string, unknown>): WorkerEnv {
  const result = workerEnvSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Invalid environment: ${result.error.message}`);
  }
  return result.data;
}
