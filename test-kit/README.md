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
