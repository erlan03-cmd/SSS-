# SSS+ Inventory

Внутренняя система учета товаров для строительной компании.

## Стек

- Next.js 15 App Router + TypeScript
- Tailwind CSS + shadcn/ui-style компоненты
- Prisma + PostgreSQL
- Простая защита админки через `ADMIN_SECRET_KEY`

## Режимы

- `/cash` — касса для сотрудников. Быстрый поиск, продажа, закупка, последние 10 операций. Точные остатки скрыты.
- `/admin` — админка владельца. Точные остатки, стоимость склада, продажи, доход, низкие остатки, история и редактирование товаров.

## Локальный запуск

1. Установите зависимости:

```bash
npm install
```

2. Создайте `.env` из примера:

```bash
cp .env.example .env
```

3. Заполните переменные:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
ADMIN_SECRET_KEY="your-long-owner-password"
```

4. Примените миграции и добавьте seed-данные:

```bash
npm run db:migrate -- --name init
npm run db:seed
```

5. Запустите приложение:

```bash
npm run dev
```

## Railway.app

1. Создайте Railway project и добавьте PostgreSQL.
2. В сервисе приложения задайте переменные:
   - `DATABASE_URL` — Railway обычно подставляет из PostgreSQL автоматически.
   - `ADMIN_SECRET_KEY` — секретный ключ владельца.
3. Подключите репозиторий и деплойте.

`railway.json` запускает миграции перед стартом:

```bash
npm run db:deploy && npm run start
```

Seed в продакшене запускайте вручную, если нужен стартовый каталог:

```bash
railway run npm run db:seed
```

## Полезные команды

```bash
npm run lint
npm run build
npm run db:generate
npm run db:deploy
```
