Проект автоматизации бронирования комнат ретритом

// ОПИСАНИЕ

Сделай удобное веб-приложение на английском языке для регистрации гостей в ретрит-центре.

ОСНОВНЫЕ СУЩНОСТИ

Роли пользователей (администратор, менеджер, организатор, такси). Не редактируется.

*** Пользователи ***.

Данные: Имя, логин, пароль, роль, ретрит(обязательно для пользователя с правами организатор, оно будет ограничивать его действия одним конкретным ретритом). Редактирование: только пользователям с правами администратора.

Примечание: По умолчанию создать пользователя admin, пароль innerlight12, с правами администратора.

*** Дома ***
Данные: имя дома. 
Редактирование: только администратор. 

Примечание: двухуровневая иерархия, дом может принадлежать группе домов. 

*** Комнаты *** 
Данные: номер комнаты(максимум три знака), принадлежит конкретному дому, доступность. 

Редактирование: администратор

Отображение комнаты в программе: основное отображение по правилу: если имя дома оканчивается на строчную s, то имя дома без s на конце + пробел + номер комнаты, в противном случае имя дома плюс номер комнаты без пробела между ними. Исключение для карты дома, если дом не является группой домов, то отображаем в карте только номера, чтобы не было масла масляного.

*** Карта дома ***

Задается для конкретного дома или группы домов. Позволяет загрузить фоновую картинку и визуально расставить на ней комнаты. Доступны должны быть только комнаты в иерархии этого дома/группы домов. Редактирование: только администратор.

У карты дома есть форма списка, форма расстановки домов(для конкретного дома) и форма просмотра и изменения статуса заселения.

ТЕКУЩЕЕ РЕШЕНИЕ ПО ИНТЕРФЕЙСУ КАРТ:
- Отдельный список карт в интерфейсе администратора не делаем.
- В списке домов есть отдельная колонка Map с кнопкой Create map / Edit map.
- Кнопка открывает отдельный компонент редактора карты.
- Компоненты карт лежат отдельно от компонентов домов: src/components/houseMaps.
- HouseMapEditor — административная форма создания/редактирования карты.
- HouseMapView — рабочая карта для пользователей, выбора комнаты и изменения статусов.
- Фоновое изображение карты хранится в Supabase Storage, URL хранится в house_maps.bg_image_url.
- Координаты комнат house_maps.room_positions хранятся в JSON в формате:
  { "room_id": number, "x": number, "y": number }
- x и y считаются процентами от размера карты (0–100), а не пикселями.
- Старые координаты карт не мигрируем автоматически; при необходимости старые комнаты будут перерасставлены вручную.
- Для обычного дома на карте отображается только номер комнаты.
- Для группы домов используется полное стандартное представление комнаты.

По последней форме правила следующие:

Наверху закладки для каждой существующей карты. При выборе закладки (по умолчанию последняя где было совершено действие), внизу отображается карта с представлением комнат. Если комната недоступна, она отображается серым. Под представлением комнаты отображаются в столбик имена гостей. Темно серым - забронированные, зеленым - заселенные, синим - зарегистрированные. Перечеркнутым черным - те кто не приедет.

Форма работает в двух режимах:
- Выбора комнаты (вызывается например из списка гостей)
- Просмотра и изменения статуса.

Во втором режиме действуют правила:
Пользователь с правами организатора может кликнуть на гостя и получить список опций: установить статус "не приедет", перенести в другую комнату(при выборе опций остается та же карта но с лейблом выберите комнату для переноса, выбор может происходить в рамках любых доступных домов, и кнопкой отмена если передумает), поменяться с - в этом случае клик на другого гостя и выбором с той же карты но лейблом "Выберите гостя" после запроса подтверждения меняет их местами.

Пользователь с правами менеджера по клику может поменять статус гостя. Статус ему доступен только следующий в иерархии: забронирован, заселен, зарегистрирован. То есть с забронирован сразу в зарегистрировано нельзя. При этом будет два пункта меню в интерфейсе менеджера: заселение, стойка регистрации. Если выбрано меню заселение то пункт регистрации недоступен, он лишь может заселить гостя и отменить заселение если оно сделано по ошибке.


*** Ретриты ***

Данные: название, основная дата заезда, дата выезда, галочка активный

Редактирование: только администратор

*** Гости ретрита ***

Данные: ретрит, имя, является ли организатором, принадлежность ретриту, дата заезда (если отличается от даты заезда ретрита), диета (строка с описанием)

Редактирование: администратор, организатор ретрита

ТЕКУЩЕЕ РЕШЕНИЕ ПО ИНТЕРФЕЙСУ ГОСТЕЙ:
- Список гостей всегда отображается для конкретного ретрита.
- Над списком находится поле Retreat.
- Для администратора показываются только активные ретриты.
- Активные ретриты сортируются по start_date по возрастанию; по умолчанию выбирается наиболее ранний активный ретрит.
- Для организатора retreat_id заранее задан текущим пользователем и изменить ретрит нельзя.
- Временно в форме Add/Edit guest комната выбирается через select.
- Комнаты в select сортируются по принятому правилу roomsService.sortRooms.
- Позже щелчок по колонке Room в списке гостей должен открывать HouseMapView в режиме выбора комнаты.
- Обработчик клика по Room уже может существовать, но до готовности режима выбора карты должен сразу делать return.

*** Доступность комнат для ретрита *** 

Данные: ретрит, комната, максимальное количество гостей Редактирование: администратор

По умолчанию все комнаты для ретрита недоступны, пока администратор не пометит их доступными. В интерфейсе можно выбрать дом или группу домов и все комнаты станут доступными кроме комнат, у которых в карточке стоит признак не доступен.

*** статусы заселения гостя *** 

Данные: гость, комната, статус (забронирован, заселён, зарегистрирован, не приедет), пользователь внесший изменение, дата изменения. При указании комнаты гостю автоматически делается запись в эту таблицу со статусом забронировано. При смене гостем комнаты делается запись со статусом забронировано.

Дополнение к БД: в guest_statuses добавлено текстовое поле room. При создании записи статуса в него сразу записывается строковое представление комнаты на момент изменения статуса.

Редактирование: администратор, организатор(только на этапе указания комнат, прямого доступа к изменениям статуса не имеет), менеджер

*** Машины Такси ***

Данные: ретрит, дата время прибытия, список гостей. Вводится администратором, ролью такси для определенного ретрита.

Список гостей выбирается из забронировавших ранее, но также можно добавить дополнительно без бронирования, они должны отображаться отдельно.

В списке ввода и редактирования машины нумеруются такси 1, такси 2 и т.д. в зависимости от времени прибытия. Слева выбираем такси, справа видим в верхней части пассажиров, в нижней - прочих гостей ретрита с указанием такси, если оно им уже назначено, но оставить возможность переназначить на текущее выбранное. Есть поле поиска чтобы быстро найти нужного гостя. "Плюс" напротив каждого гостя чтобы его добавить в текущее выбранное такси.

В списке просмотра в интерфейсе менеджера список такси также слева (также пронумерован такси 1, такси 2 и т.д., видно время прибытия и количесво пассажиров еще не заселенных, если все заселены машина показывается серым), справа пассажиры, отсортированные по имени дома, где забронирована их комната, в отдельной колонке показано стандартное представление комнаты. Есть возможность отсюда одной кнопкой заселить гостя если он еще не заселен.

_------------

Администратору доступны все формы и интерфейсы:

Таксисту доступно: 
- список машин такси

Менеджеру доступны: 
- список машин такси
- карты домов в режиме заселения
- карты домов в режиме стойки регистрации

Организатору доступны
- список машин такси (только для просмотра без возможности заселения)
- список гостей для редактирования (из этого списка он сможет выбрать комнату) 

// КОНЕЦ ОПИСАНИЯ

ПРАВИЛА КОДА

АРХИТЕКТУРА ДОСТУПА К ДАННЫМ

Используется трехуровневая схема:

Component
  ↓
entityService
  ↓
database.ts
  ↓
Supabase

1. src/services/database.ts — единственный низкоуровневый адаптер к конкретной БД.
2. В database.ts находится объект db с полями по сущностям:
   db.guests
   db.retreats
   db.houses
   db.rooms
   db.houseMaps
   db.guestStatuses
   db.taxiRides
   db.taxiGuests
   db.users
   db.roles
   и т.д.
3. Методы database.ts имеют короткие технические имена:
   getAll()
   getById()
   getByRetreatId()
   create()
   update()
   delete()
4. В entityService конкретная технология БД не используется. Сервис обращается только к объекту db.
5. Все сервисы экспортируются объектами default, например:

const retreatsService = {
  getRetreats: async () => { ... },
  getActiveRetreats: async () => { ... },
};

export default retreatsService;

6. В сервисах хранится бизнес-логика сущности:
   - формат отображения комнаты;
   - сортировка комнат;
   - подготовка комнат для карты;
   - работа с координатами карты;
   - получение последнего статуса;
   и т.д.
7. Компоненты не должны обращаться к Supabase напрямую.
8. Компонент списка сам загружает необходимые ему данные при открытии. page.tsx не загружает данные конкретной сущности и не передает их в list-компонент.
9. Supabase сейчас временная БД. Цель database.ts — позволить заменить Supabase другой БД без изменения сервисов и компонентов.

ПРАВИЛА JSX

1. В JSX не пишем вычисления бизнес-данных. Значения рассчитываются до return компонента.
2. В JSX не пишем текстовые литералы. Текст интерфейса объявляется в начале компонента:
   const strTitle = "Retreats";
3. В JSX запрещены inline-функции:
   НЕЛЬЗЯ:
   onClick={() => onMenuClick(item.label)}
   НУЖНО:
   onClick={item.onClickHandler}
4. Правило inline-функций относится именно к JSX. В useEffect, map, сервисах и обычном TypeScript анонимные функции допустимы.
5. Простые булевы условия в JSX допустимы:
   {isOpen ? <Form /> : null}
6. Условный className в JSX допустим, если это только простое визуальное состояние.
7. map массива в JSX допустим, если внутри него нет вычислений. Если для элемента нужны вычисления или обработчики, сначала создаем prepared-массив до JSX, а в JSX только отображаем его поля.
8. Между соседними JSX-элементами лишние пустые строки не ставим.
9. Если тег и содержимое короткие, пишем их в одну строку:
   <td className="px-4 py-3">{retreat.title}</td>

ФОРМАТИРОВАНИЕ TYPESCRIPT

1. До 3 параметров функции включительно оставляем в одной строке, если строка остается читаемой.
2. При 4 и более параметрах переносим параметры на отдельные строки.
3. Не делаем бессмысленные переносы одного-двух коротких параметров.
4. Для submit-событий React используем SyntheticEvent, не deprecated FormEvent.
5. Generic-компоненты не должны терять тип через any без необходимости.

ОБЩИЕ КОМПОНЕНТЫ

src/components/common/ActionBar.tsx
- Универсальная панель действий для списков.
- По умолчанию Add / Edit / Delete.
- Принимает selectedItem.
- Edit и Delete недоступны без выбранной записи.
- Дополнительные действия передаются через extraActions.
- Используется во всех обычных CRUD-списках вместо дублирования кнопок.
- Компонент типизирован через generic T.

ОСНОВНАЯ ОБОЛОЧКА

src/app/page.tsx только отображает AppShell.

AppShell содержит левое меню и рабочую область.

Интерфейсы регистрируются объектом, без isSelectedThis / isSelectedThat:

const interfaces: Record<string, () => React.ReactNode> = {
  "Retreats": () => <RetreatsList />,
  "Guests": () => <GuestsList />,
  "Houses": () => <HousesList />,
  "Rooms": () => <RoomsList />,
};

Ключи объекта меню всегда пишем в кавычках, потому что пункты могут состоять из нескольких слов.

КОМНАТЫ

Стандартное представление комнаты реализуется в roomsService.getRoomDisplayName().

Сортировка комнат реализуется в roomsService.sortRooms():
- сначала имя дома;
- если номер комнаты начинается с буквенного префикса, этот префикс участвует в ключе после имени дома;
- числовая часть номера сортируется как число, а не строка;
- пример правильного порядка: A1, A2, A10, B1, B2, а не A1, A10, A2.

КАРТЫ ДОМОВ

Компоненты:
src/components/houseMaps/HouseMapEditor.tsx
src/components/houseMaps/HouseMapView.tsx

HouseMapEditor:
- только административное редактирование;
- загружает фон;
- показывает доступные комнаты слева;
- позволяет drag-and-drop комнат на карту;
- позволяет двигать уже размещенные комнаты;
- сохраняет x/y в процентах;
- работает и для дома, и для группы домов.

HouseMapView:
- отдельный рабочий компонент для пользователей;
- сверху вкладки существующих карт;
- карта и комнаты;
- гости под комнатами;
- позже используется в режимах выбора комнаты, заселения и регистрации.

Существующая запись house_maps не удаляется при редактировании; редактор загружает bg_image_url и room_positions.

SUPABASE STORAGE

Bucket для фоновых изображений карт:
house-maps

Во время разработки приложение использует anon key.
Для загрузки файлов Storage требуется RLS policy на storage.objects.
После реализации нормальной авторизации политики должны быть ограничены ролью администратора.

ТЕКУЩАЯ СТРУКТУРА КОМПОНЕНТОВ

src/
  app/
    page.tsx
  components/
    common/
      ActionBar.tsx
    layout/
      AppShell.tsx
      Sidebar.tsx
    retreats/
      RetreatsList.tsx
      RetreatForm.tsx
    houses/
      HousesList.tsx
      HouseForm.tsx
    rooms/
      RoomsList.tsx
      RoomForm.tsx
    guests/
      GuestsList.tsx
      GuestForm.tsx
    houseMaps/
      HouseMapEditor.tsx
      HouseMapView.tsx
  services/
    database.ts
    supabase.ts
    retreatsService.ts
    housesService.ts
    roomsService.ts
    guestsService.ts
    guestStatusesService.ts
    houseMapsService.ts

ТЕКУЩЕЕ СОСТОЯНИЕ РАЗРАБОТКИ

Готово / начато:
- Next.js приложение.
- Подключение Supabase через .env.local и anon key.
- database.ts как адаптер БД.
- CRUD Retreats.
- CRUD Houses.
- CRUD Rooms.
- ActionBar.
- AppShell + Sidebar.
- HouseMapEditor.
- Базовый HouseMapView.
- Начата реализация GuestsList / GuestForm.

Следующий рабочий этап:
- завершить список/форму гостей;
- корректно создавать guest_statuses при назначении или смене комнаты;
- сохранять текстовое представление комнаты в guest_statuses.room;
- затем подключить HouseMapView в режим выбора комнаты из GuestsList;
- после этого перейти к пользовательским режимам карт и ролям.


СТРУКТУРА БД

[
  {
    "table_name": "guest_statuses",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "guest_statuses",
    "column_name": "guest_id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "guest_statuses",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "guest_statuses",
    "column_name": "room",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "guest_statuses",
    "column_name": "updated_by",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "guest_statuses",
    "column_name": "changed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "timezone('utc'::text, now())",
    "is_primary_key": "NO"
  },
  {
    "table_name": "guests",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "guests",
    "column_name": "retreat_id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "guests",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "guests",
    "column_name": "is_organizer",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "false",
    "is_primary_key": "NO"
  },
  {
    "table_name": "guests",
    "column_name": "arrival_date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "guests",
    "column_name": "diet_notes",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "guests",
    "column_name": "room_id",
    "data_type": "bigint",
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "guests",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "timezone('utc'::text, now())",
    "is_primary_key": "NO"
  },
  {
    "table_name": "house_maps",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "house_maps",
    "column_name": "house_id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "house_maps",
    "column_name": "bg_image_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "house_maps",
    "column_name": "room_positions",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": "'[]'::jsonb",
    "is_primary_key": "NO"
  },
  {
    "table_name": "house_maps",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "timezone('utc'::text, now())",
    "is_primary_key": "NO"
  },
  {
    "table_name": "houses",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "houses",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "houses",
    "column_name": "parent_id",
    "data_type": "bigint",
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "houses",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "timezone('utc'::text, now())",
    "is_primary_key": "NO"
  },
  {
    "table_name": "retreat_rooms",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "retreat_rooms",
    "column_name": "retreat_id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "retreat_rooms",
    "column_name": "room_id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "retreat_rooms",
    "column_name": "max_guests",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "2",
    "is_primary_key": "NO"
  },
  {
    "table_name": "retreats",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "retreats",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "retreats",
    "column_name": "start_date",
    "data_type": "date",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "retreats",
    "column_name": "end_date",
    "data_type": "date",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "retreats",
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "true",
    "is_primary_key": "NO"
  },
  {
    "table_name": "retreats",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "timezone('utc'::text, now())",
    "is_primary_key": "NO"
  },
  {
    "table_name": "roles",
    "column_name": "role_name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "rooms",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "rooms",
    "column_name": "room_number",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "rooms",
    "column_name": "house_id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "rooms",
    "column_name": "is_available",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "true",
    "is_primary_key": "NO"
  },
  {
    "table_name": "rooms",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "timezone('utc'::text, now())",
    "is_primary_key": "NO"
  },
  {
    "table_name": "taxi_guests",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "taxi_guests",
    "column_name": "ride_id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "taxi_guests",
    "column_name": "guest_id",
    "data_type": "bigint",
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "taxi_guests",
    "column_name": "unbooked_guest_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "taxi_rides",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "taxi_rides",
    "column_name": "retreat_id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "taxi_rides",
    "column_name": "arrival_datetime",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "taxi_rides",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "timezone('utc'::text, now())",
    "is_primary_key": "NO"
  },
  {
    "table_name": "users",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "users",
    "column_name": "id",
    "data_type": "bigint",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES"
  },
  {
    "table_name": "users",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "users",
    "column_name": "login",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "users",
    "column_name": "password",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "users",
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO"
  },
  {
    "table_name": "users",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "timezone('utc'::text, now())",
    "is_primary_key": "NO"
  },
  {
    "table_name": "users",
    "column_name": "retreat_id",
    "data_type": "bigint",
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO"
  }
]

