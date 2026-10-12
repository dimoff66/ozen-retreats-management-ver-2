# Retreat service test kit

Это ручной integration test-kit без Vitest/Jest и без собственного runner.
Каждая экспортируемая функция вызывает настоящий service, перечитывает результат
через service API и возвращает:

```ts
Promise<true | string>
```

`true` означает успех, строка — описание первой обнаруженной ошибки.

## Важно

Функции выполняют реальные записи в настроенную базу. Запускайте их только на
тестовом ретрите/тестовой базе и передавайте специально подготовленные id.
Функции create/update/delete намеренно не скрывают побочные эффекты и не пытаются
автоматически откатить данные, потому что автоматический cleanup сам является
дополнительной записью и может скрыть исходную ошибку.

Файлы:

```text
test-kit/retreat-services/
  retreatsService.ts
  retreatRoomsService.ts
  guestsService.ts
  guestStatusesService.ts
  taxiRidesService.ts
  types.ts
```

Глобальные справочники Houses/Rooms/Users не включены: этот kit сфокусирован на
записи данных конкретного ретрита. `retreatSnapshotService` также не включён,
поскольку он только читает агрегат.

## Пример

```ts
import { testSwapGuestRooms } from "./retreat-services/guestsService";

const result = await testSwapGuestRooms({
  firstGuestId: 101,
  secondGuestId: 102,
  retreatId: 5,
  expectedFirstRoomLabel: "Buddha 2",
  expectedSecondRoomLabel: "Buddha 1",
});

if (result !== true) {
  console.error(result);
}
```

## Автоматический запуск через Vitest

Существующие функции `Promise<true | string>` используются как основной test-kit.
Vitest-файлы в `tests/services/` не дублируют их проверки, а создают безопасный
временный контекст, вызывают функции test-kit и преобразуют результат в обычный
`expect(...).toBe(true)`.

Перед запуском должны быть доступны те же переменные Supabase, что и приложению:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Можно использовать существующий `.env.local` проекта.

Установка и запуск:

```bash
npm install
npm run test:services
```

Для режима наблюдения:

```bash
npm run test:watch
```

## Работа с реальной базой

Integration tests используют текущую настроенную базу, но не изменяют рабочие
Houses и Rooms. Для каждого service suite создаётся временный неактивный retreat
с префиксом `__TEST__`.

Из существующей базы только читаются комнаты:

```text
Cubes A1
Cubes A2
Cubes B1
Cones 1
```

Для временного retreat создаются собственные `retreat_rooms`, guests, statuses и
Taxi records. После каждого теста очищаются изменяемые данные, а после suite
удаляется сам test-retreat.

Test fixture также только читает существующего пользователя `admin`, чтобы получить
`updated_by` для status-записей. Этот setup-read выполняется напрямую через DB
adapter; client `usersService` после auth-рефакторинга остаётся API-only и не
содержит `getUserByLogin`.

Если тестовый процесс будет аварийно остановлен до cleanup, в базе может остаться
retreat с префиксом `__TEST__`. Рабочие retreats при этом тестами не выбираются и
не изменяются.
