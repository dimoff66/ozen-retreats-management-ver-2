# Ozen Retreats Management

Веб-приложение для управления ретритами, гостями, размещением по комнатам,
картами домов, заселением и трансферами.

## Технологии

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase / PostgreSQL
- Supabase Storage

## Запуск локально

1. Установите зависимости:

   ```bash
   npm ci
   ```

2. Создайте `.env.local` в корне проекта и задайте переменные:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
   ```

   Не используйте `service_role` или другой секретный ключ в переменной
   `NEXT_PUBLIC_*`.

3. Запустите приложение:

   ```bash
   npm run dev
   ```

Основные команды:

```bash
npm run lint
npm run build
```

## Документация

- [Архитектура и структура кода](docs/architecture.md)
- [Схема базы данных и доменные правила](docs/domain/database.md)
- [Роли и рабочие сценарии](docs/domain/roles-and-workflows.md)
- [Правила рабочей карты домов](docs/domain/house-maps.md)

## Инструкции для AI-агентов

Общие инструкции Copilot находятся в
[`.github/copilot-instructions.md`](.github/copilot-instructions.md), а правила
TypeScript и React — в
[`.github/instructions/react-typescript.instructions.md`](.github/instructions/react-typescript.instructions.md).

// Тест CodeRabbit again 
