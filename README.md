# Marketplace API

High-load store backend: **NestJS**, **PostgreSQL**, **Redis** (catalog cache), **BullMQ** (order pipeline and notification jobs). API and worker run as separate deployable processes.

## Architecture

| Path | Role |
|------|------|
| `apps/api` | HTTP API, Redis cache-aside for products, enqueues BullMQ jobs |
| `apps/worker` | BullMQ consumers: order lifecycle + notification dispatch |
| `libs/domain` | Queue names and job payloads |
| `libs/config` | Zod-validated environment for API and worker |
| `libs/database` | Global `PrismaModule` |

Order flow: `POST /orders` with **`Idempotency-Key`** → row in DB (`pending`) + job on `orders` queue → worker moves to `processing` → `completed` and enqueues `notifications`.

## Requirements

- Node.js 20+
- PostgreSQL 16+ and Redis 7+ (local or Docker)

## Local setup

1. Copy [`/.env.example`](.env.example) to `.env`.
2. Start infrastructure, for example:

   ```bash
   docker compose up -d postgres redis
   ```

3. Apply schema and seed:

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. Run API and worker in two terminals:

   ```bash
   npm run start:api
   ```

   ```bash
   npm run start:worker
   ```

5. `GET http://localhost:3000/health` — expect `database` and `redis` **up**.

### Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `API_PORT` | HTTP port (default `3000`) |

## Docker

```bash
docker compose build
docker compose up -d postgres redis
npx prisma migrate deploy
docker compose up -d api worker
```

Use the same `DATABASE_URL` as in `docker-compose.yml` when running `prisma migrate deploy` from the host.

## HTTP API

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | PostgreSQL + Redis |
| GET | `/products` | List (cached) |
| GET | `/products/:id` | Detail (cache-aside) |
| POST | `/products` | Create |
| PATCH | `/products/:id` | Update (cache invalidate) |
| POST | `/orders` | **202**, requires `Idempotency-Key` |
| GET | `/orders/:id` | Order + lines |

Example:

```http
POST /orders HTTP/1.1
Content-Type: application/json
Idempotency-Key: unique-key-123

{
  "items": [{ "productId": "<uuid>", "quantity": 1 }],
  "customerEmail": "user@example.com"
}
```

## Load test (k6)

Install [k6](https://k6.io/). Use a product id from `GET /products`:

```bash
k6 run -e PRODUCT_ID=<uuid> scripts/load-test/orders-spike.js
```

Optional: `-e BASE_URL=https://your-host`.

## npm scripts

| Script | Action |
|--------|--------|
| `npm run build` | Webpack build: `api` + `worker` |
| `npm run start:api` | API watch |
| `npm run start:worker` | Worker watch |
| `npm run start:api:prod` | `node dist/apps/api/main.js` |
| `npm run start:worker:prod` | `node dist/apps/worker/main.js` |

## Stack

NestJS 10 · Prisma 5 · PostgreSQL · Redis · BullMQ · class-validator · Zod · Terminus · Throttler (`/health` excluded from rate limit)

---

## Как красиво выложить на GitHub

### 1. Проверка перед коммитом

- В репозитории не должно быть `.env` — только [`.env.example`](.env.example).
- [`.gitignore`](.gitignore) уже исключает `node_modules/`, `dist/`, `.env`, `coverage/`.
- Не коммить пароли, токены и продакшен-URL.

### 2. Первый коммит локально

```bash
cd путь/к/проекту
git init
git add .
git commit -m "feat: marketplace API, BullMQ workers, Redis cache"
```

Если репозиторий уже инициализирован: `git add` → `git commit` → `git push`.

### 3. Создание репозитория на GitHub

1. Открой [github.com/new](https://github.com/new).
2. **Repository name**, например: `marketplace-api`.
3. **Description** (строка под названием), например:  
   `NestJS + PostgreSQL + Redis + BullMQ — асинхронные заказы и кэш каталога`
4. Тип **Public** — удобно для портфолио.
5. Не добавляй с сайта README, `.gitignore` и лицензию, если они уже есть в папке.
6. **Create repository**.

### 4. Привязка `origin` и push

Подставь свой логин и имя репозитория.

HTTPS:

```bash
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО.git
git push -u origin main
```

SSH:

```bash
git remote add origin git@github.com:ВАШ_ЛОГИН/ИМЯ_РЕПО.git
git push -u origin main
```

Если `origin` уже создан с неверным URL:

```bash
git remote set-url origin https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО.git
git push -u origin main
```

### 5. Оформление страницы репозитория

На GitHub: блок **About** (шестерёнка):

- **Description** — одна фраза про стек и идею (очереди, воркер, кэш).
- **Website** — по желанию: ссылка на деплой или документацию.
- **Topics**: `nestjs`, `typescript`, `postgresql`, `redis`, `bullmq`, `prisma`, `docker`, `microservices`, `queue`, `portfolio`.

На профиле можно **закрепить** репозиторий: **Customize your pins**.

### 6. Следующие изменения

```bash
git add -A
git commit -m "fix: краткое описание изменения"
git push
```

Удобный стиль сообщений: `feat(orders): …`, `fix(cache):
 …`, `chore: …`.

### 7. По желанию

- Файл **LICENSE** (например MIT).
- **GitHub Actions**: job `npm ci`, `npm run build`, `npx prisma validate`.

**Деплой:** в секретах укажи `DATABASE_URL` и параметры Redis; запускай API и отдельный worker с тем же Redis.

---
