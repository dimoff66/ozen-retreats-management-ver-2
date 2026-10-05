# База данных и правила предметной области

Ниже описана структура таблиц и правила, на которые опираются сервисы и
интерфейс. При изменении схемы синхронно обновляйте документацию, адаптер и
использующие эту схему сервисы.

## `users`

```text
id bigint primary key
name text
login text
password text
role text
retreat_id bigint nullable
created_at timestamptz
```

`retreat_id` используется главным образом для привязки organizer к ретриту.
Администратор управляет пользователями через раздел Admin → Users. При создании
задаются имя, логин, пароль и роль; для organizer можно назначить ретрит.
При редактировании пустое поле пароля означает, что текущий пароль не меняется.

## `roles`

```text
role_name text primary key
```

Содержит допустимые роли приложения.

## `houses`

```text
id bigint primary key
name text
parent_id bigint nullable
created_at timestamptz
```

`parent_id` используется для двухуровневой структуры домов. Дом может быть
самостоятельным или принадлежать группе домов.

## `rooms`

```text
id bigint primary key
room_number varchar
house_id bigint
is_available boolean default true
created_at timestamptz
```

`room_number` — максимум 3 символа. `is_available` задаёт глобальную доступность
комнаты.

### Отображаемое название комнаты

Название формируется в `roomsService`. Если название дома заканчивается на
строчную `s`, последняя `s` удаляется, а между названием и номером комнаты
ставится пробел:

```text
Buddhas + 3 → Buddha 3
```

В остальных случаях название дома и номер соединяются без пробела:

```text
Osho + 4 → Osho4
```

Если карта относится непосредственно к одному самостоятельному дому, на карте
отображается только номер комнаты.

### Сортировка комнат

Комнаты сортируются по названию дома, буквенной части номера, затем по числовой
части номера. Числовая часть сравнивается как число, а не как строка:

```text
A1, A2, A9, A10, B1, B2
```

## `retreats`

```text
id bigint primary key
title text
start_date date
end_date date
is_active boolean default true
created_at timestamptz
```

Активные ретриты сортируются по `start_date` по возрастанию. Самый ранний
активный ретрит используется как выбранный по умолчанию там, где нужен выбор
ретрита.

## `retreat_rooms`

```text
id bigint primary key
retreat_id bigint
room_id bigint
max_guests integer default 1
```

Глобальная доступность комнаты и доступность комнаты для конкретного ретрита —
разные вещи. Комната доступна для ретрита, только если `rooms.is_available =
true` и существует запись в `retreat_rooms`. Отсутствие записи означает, что
комната для ретрита недоступна.

`max_guests` определяет максимальное количество гостей в комнате для данного
ретрита; значение по умолчанию — `1`.

Комнаты настраиваются группами по домам. Для каждого дома доступны массовые
действия: сделать все комнаты доступными или недоступными, а также установить
одинаковый `max_guests` для всех комнат. Глобально недоступную комнату нельзя
включить только на уровне ретрита.

## `guests`

```text
id bigint primary key
retreat_id bigint
name text
is_organizer boolean default false
arrival_date date nullable
diet_notes text nullable
room_id bigint nullable
created_at timestamptz
```

Гость относится к конкретному ретриту и первоначально может быть без комнаты.
После назначения комнаты её нельзя просто обнулить. Допустимо оставить текущую
комнату, перенести гостя в другую или поменять гостей комнатами.

В списке гостей organizer отображается в имени, например `John Smith
(organizer)`. Дата приезда выводится серым под именем, если заполнена. Остальные данные списка: представление назначенной комнаты,
статус в цветном бейджике и меню действий. Доступные действия зависят от роли и
текущего статуса гостя.

## `guest_statuses`

```text
id bigint primary key
retreat_id bigint not null references retreats(id)
guest_id bigint
status text
room text nullable
updated_by bigint
changed_at timestamptz
```

На `retreat_id` создан индекс `idx_guest_statuses_retreat_id`; все записи
истории содержат идентификатор ретрита гостя. Это позволяет читать историю и
статусы напрямую по ретриту без соединения с `guests`.

История статусов не перезаписывается: каждое изменение создаёт новую запись.
Основные статусы:

```text
booked
arrived
checked_in
not_coming
```

Последовательность заселения:

```text
booked → arrived → checked_in
```
Но возможен откат: отмена регистрации, отмена заселения

`room` хранит текстовое отображение комнаты на момент изменения статуса.

`updated_by` указывает пользователя, выполнившего действие, а `changed_at` —
время изменения. Текущий статус гостя определяется по последней записи.

### Загрузка статусов

Статусы загружаются сразу для всего ретрита через
`guestStatusesService.getLatestForRetreat(retreatId)`. Метод возвращает
`Map<number, LatestGuestStatus>`, где ключ — `guestId`; это исключает отдельный
запрос к базе для каждого гостя.

История показывает только выбранный ретрит. `HistoryPanel` обязательно получает
`retreatId` и может дополнительно фильтровать по `guestId` или отображаемому
названию комнаты; без фильтра показывается вся история ретрита.

Примеры записей в истории:

```text
10:22 User Elena appointed room HS2 for Bryan Hump
10:37 User Ulises заселил Bryan Hamp в комнату HS2
```

## `house_maps`

```text
id bigint primary key
house_id bigint
bg_image_url text nullable
room_positions jsonb default []
```

Карта может относиться к самостоятельному дому или группе домов и содержит
фоновое изображение и позиции комнат. Позиции хранятся в JSON с координатами в
процентах относительно изображения:

```json
{
  "room_id": 12,
  "x": 42.5,
  "y": 67.1
}
```

`x` и `y` находятся в диапазоне `0–100`. Процентные координаты сохраняют
расположение комнат при изменении размера экрана.

## `taxi_rides`

```text
id bigint primary key
retreat_id bigint
arrival_datetime timestamptz
driver_name text nullable
created_at timestamptz
```

`driver_name` — необязательное текстовое имя водителя.

## `taxi_guests`

```text
id bigint primary key
ride_id bigint
guest_id bigint nullable
unbooked_guest_name text nullable
```

Пассажир может быть зарегистрированным гостем или дополнительным
незарегистрированным человеком.
