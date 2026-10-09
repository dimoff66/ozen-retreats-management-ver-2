import type { ExecuteValues } from "mysql2";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type {
  CreateGuest,
  CreateGuestStatus,
  CreateGuestStatusForNewGuest,
  CreateHouse,
  CreateHouseMap,
  CreateRetreat,
  CreateRetreatRoom,
  CreateRoom,
  CreateTaxiGuest,
  CreateTaxiRide,
  CreateTaxiRideBatch,
  CreateUser,
  Guest,
  GuestStatus,
  House,
  HouseMap,
  Retreat,
  RetreatRoom,
  Role,
  Room,
  SwapGuestRoomsData,
  SwapGuestRoomsResult,
  TaxiGuest,
  TaxiRide,
  UpdateGuest,
  UpdateHouse,
  UpdateHouseMap,
  UpdateRetreat,
  UpdateRetreatRoom,
  UpdateRoom,
  UpdateTaxiGuest,
  UpdateTaxiRide,
  UpdateUser,
  User,
} from "@/services/database";
import { getMariaDbPool } from "./mariaDbPool";

type WritableRecord = Record<string, unknown>;

const booleanColumns = new Set([
  "is_active",
  "is_available",
  "is_organizer",
]);

function normalizeReadValue(key: string, value: unknown): unknown {
  if (booleanColumns.has(key) && typeof value === "number") {
    return value !== 0;
  }

  if (key === "room_positions" && typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  return value;
}

function normalizeRow<T>(row: RowDataPacket): T {
  const normalized: WritableRecord = {};

  Object.entries(row).forEach(([key, value]) => {
    normalized[key] = normalizeReadValue(key, value);
  });

  return normalized as T;
}

function normalizeWriteValue(key: string, value: unknown): ExecuteValues {
  if (value === undefined) {
    throw new Error(`Cannot write undefined value for ${key}`);
  }

  if (booleanColumns.has(key) && typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (key === "room_positions" && value !== null && typeof value !== "string") {
    return JSON.stringify(value);
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean" ||
    value instanceof Date ||
    Buffer.isBuffer(value) ||
    value instanceof Uint8Array
  ) {
    return value;
  }

  throw new Error(`Unsupported MariaDB value for ${key}`);
}

function getWriteEntries(
  data: object,
  allowedColumns: readonly string[]
): Array<[string, ExecuteValues]> {
  const record = data as Record<string, unknown>;

  return allowedColumns
    .filter((key) => Object.prototype.hasOwnProperty.call(record, key))
    .filter((key) => record[key] !== undefined)
    .map((key) => [key, normalizeWriteValue(key, record[key])]);
}

async function selectMany<T>(sql: string, values: ExecuteValues = []): Promise<T[]> {
  const [rows] = await getMariaDbPool().execute<RowDataPacket[]>(sql, values);
  return rows.map((row) => normalizeRow<T>(row));
}

async function selectOne<T>(sql: string, values: ExecuteValues = []): Promise<T | null> {
  const rows = await selectMany<T>(sql, values);
  return rows[0] ?? null;
}

async function insertById<T>(
  table: string,
  data: object,
  allowedColumns: readonly string[]
): Promise<T> {
  const entries = getWriteEntries(data, allowedColumns);

  if (entries.length === 0) {
    throw new Error(`Cannot insert an empty record into ${table}`);
  }

  const columns = entries.map(([key]) => `\`${key}\``).join(", ");
  const placeholders = entries.map(() => "?").join(", ");
  const values = entries.map(([, value]) => value);
  const [result] = await getMariaDbPool().execute<ResultSetHeader>(
    `insert into \`${table}\` (${columns}) values (${placeholders})`,
    values
  );
  const row = await selectOne<T>(
    `select * from \`${table}\` where id = ? limit 1`,
    [result.insertId]
  );

  if (!row) {
    throw new Error(`Failed to read inserted ${table} record`);
  }

  return row;
}

async function updateById<T>(
  table: string,
  id: number,
  changes: object,
  allowedColumns: readonly string[]
): Promise<T> {
  const entries = getWriteEntries(changes, allowedColumns);

  if (entries.length > 0) {
    const assignments = entries.map(([key]) => `\`${key}\` = ?`).join(", ");
    const values = entries.map(([, value]) => value);
    await getMariaDbPool().execute<ResultSetHeader>(
      `update \`${table}\` set ${assignments} where id = ?`,
      [...values, id]
    );
  }

  const row = await selectOne<T>(
    `select * from \`${table}\` where id = ? limit 1`,
    [id]
  );

  if (!row) {
    throw new Error(`${table} record ${id} was not found`);
  }

  return row;
}

async function deleteById(table: string, id: number): Promise<void> {
  await getMariaDbPool().execute<ResultSetHeader>(
    `delete from \`${table}\` where id = ?`,
    [id]
  );
}

async function selectOneWithConnection<T>(
  connection: PoolConnection,
  sql: string,
  values: ExecuteValues = []
): Promise<T | null> {
  const [rows] = await connection.execute<RowDataPacket[]>(sql, values);
  return rows[0] ? normalizeRow<T>(rows[0]) : null;
}

async function insertByIdWithConnection<T>(
  connection: PoolConnection,
  table: string,
  data: object,
  allowedColumns: readonly string[]
): Promise<T> {
  const entries = getWriteEntries(data, allowedColumns);

  if (entries.length === 0) {
    throw new Error(`Cannot insert an empty record into ${table}`);
  }

  const columns = entries.map(([key]) => `\`${key}\``).join(", ");
  const placeholders = entries.map(() => "?").join(", ");
  const values = entries.map(([, value]) => value);
  const [result] = await connection.execute<ResultSetHeader>(
    `insert into \`${table}\` (${columns}) values (${placeholders})`,
    values
  );
  const row = await selectOneWithConnection<T>(
    connection,
    `select * from \`${table}\` where id = ? limit 1`,
    [result.insertId]
  );

  if (!row) {
    throw new Error(`Failed to read inserted ${table} record`);
  }

  return row;
}

async function updateByIdWithConnection<T>(
  connection: PoolConnection,
  table: string,
  id: number,
  changes: object,
  allowedColumns: readonly string[]
): Promise<T> {
  const entries = getWriteEntries(changes, allowedColumns);

  if (entries.length > 0) {
    const assignments = entries.map(([key]) => `\`${key}\` = ?`).join(", ");
    const values = entries.map(([, value]) => value);
    await connection.execute<ResultSetHeader>(
      `update \`${table}\` set ${assignments} where id = ?`,
      [...values, id]
    );
  }

  const row = await selectOneWithConnection<T>(
    connection,
    `select * from \`${table}\` where id = ? limit 1`,
    [id]
  );

  if (!row) {
    throw new Error(`${table} record ${id} was not found`);
  }

  return row;
}

const userColumns = ["name", "login", "password", "role", "retreat_id"] as const;
const houseColumns = ["name", "parent_id"] as const;
const roomColumns = ["room_number", "house_id", "is_available"] as const;
const houseMapColumns = ["house_id", "bg_image_url", "room_positions"] as const;
const retreatColumns = ["title", "start_date", "end_date", "is_active"] as const;
const retreatRoomColumns = ["retreat_id", "room_id", "max_guests"] as const;
const guestColumns = [
  "retreat_id",
  "name",
  "is_organizer",
  "arrival_date",
  "diet_notes",
  "room_id",
] as const;
const guestStatusColumns = [
  "retreat_id",
  "guest_id",
  "status",
  "room",
  "updated_by",
] as const;
const taxiRideColumns = ["retreat_id", "arrival_datetime", "driver_name"] as const;
const taxiGuestColumns = ["ride_id", "guest_id", "unbooked_guest_name"] as const;

const mariaDbServer = {
  roles: {
    getAll: async (): Promise<Role[]> => {
      return selectMany<Role>("select * from `roles` order by role_name");
    },

    getByName: async (roleName: string): Promise<Role | null> => {
      return selectOne<Role>(
        "select * from `roles` where role_name = ? limit 1",
        [roleName]
      );
    },
  },

  users: {
    getAll: async (): Promise<User[]> => {
      return selectMany<User>("select * from `users` order by name");
    },

    getById: async (id: number): Promise<User | null> => {
      return selectOne<User>("select * from `users` where id = ? limit 1", [id]);
    },

    getByLogin: async (login: string): Promise<User | null> => {
      return selectOne<User>(
        "select * from `users` where login = ? limit 1",
        [login]
      );
    },

    create: async (user: CreateUser): Promise<User> => {
      return insertById<User>("users", user, userColumns);
    },

    update: async (id: number, changes: UpdateUser): Promise<User> => {
      return updateById<User>("users", id, changes, userColumns);
    },

    delete: async (id: number): Promise<void> => {
      await deleteById("users", id);
    },
  },

  houses: {
    getAll: async (): Promise<House[]> => {
      return selectMany<House>("select * from `houses` order by id");
    },

    getById: async (id: number): Promise<House | null> => {
      return selectOne<House>("select * from `houses` where id = ? limit 1", [id]);
    },

    getByParentId: async (parentId: number): Promise<House[]> => {
      return selectMany<House>(
        "select * from `houses` where parent_id = ? order by id",
        [parentId]
      );
    },

    create: async (house: CreateHouse): Promise<House> => {
      return insertById<House>("houses", house, houseColumns);
    },

    update: async (id: number, changes: UpdateHouse): Promise<House> => {
      return updateById<House>("houses", id, changes, houseColumns);
    },

    delete: async (id: number): Promise<void> => {
      await deleteById("houses", id);
    },
  },

  rooms: {
    getAll: async (): Promise<Room[]> => {
      return selectMany<Room>("select * from `rooms` order by room_number");
    },

    getById: async (id: number): Promise<Room | null> => {
      return selectOne<Room>("select * from `rooms` where id = ? limit 1", [id]);
    },

    getByHouseId: async (houseId: number): Promise<Room[]> => {
      return selectMany<Room>(
        "select * from `rooms` where house_id = ? order by room_number",
        [houseId]
      );
    },

    create: async (room: CreateRoom): Promise<Room> => {
      return insertById<Room>("rooms", room, roomColumns);
    },

    update: async (id: number, changes: UpdateRoom): Promise<Room> => {
      return updateById<Room>("rooms", id, changes, roomColumns);
    },

    delete: async (id: number): Promise<void> => {
      await deleteById("rooms", id);
    },
  },

  houseMaps: {
    getAll: async (): Promise<HouseMap[]> => {
      return selectMany<HouseMap>("select * from `house_maps`");
    },

    getById: async (id: number): Promise<HouseMap | null> => {
      return selectOne<HouseMap>(
        "select * from `house_maps` where id = ? limit 1",
        [id]
      );
    },

    getByHouseId: async (houseId: number): Promise<HouseMap | null> => {
      return selectOne<HouseMap>(
        "select * from `house_maps` where house_id = ? limit 1",
        [houseId]
      );
    },

    create: async (houseMap: CreateHouseMap): Promise<HouseMap> => {
      return insertById<HouseMap>("house_maps", houseMap, houseMapColumns);
    },

    update: async (id: number, changes: UpdateHouseMap): Promise<HouseMap> => {
      return updateById<HouseMap>("house_maps", id, changes, houseMapColumns);
    },

    delete: async (id: number): Promise<void> => {
      await deleteById("house_maps", id);
    },
  },

  retreats: {
    getAll: async (): Promise<Retreat[]> => {
      return selectMany<Retreat>(
        "select * from `retreats` order by start_date desc"
      );
    },

    getById: async (id: number): Promise<Retreat | null> => {
      return selectOne<Retreat>(
        "select * from `retreats` where id = ? limit 1",
        [id]
      );
    },

    getActive: async (): Promise<Retreat[]> => {
      return selectMany<Retreat>(
        "select * from `retreats` where is_active = 1 order by start_date asc"
      );
    },

    create: async (retreat: CreateRetreat): Promise<Retreat> => {
      return insertById<Retreat>("retreats", retreat, retreatColumns);
    },

    update: async (id: number, changes: UpdateRetreat): Promise<Retreat> => {
      return updateById<Retreat>("retreats", id, changes, retreatColumns);
    },

    delete: async (id: number): Promise<void> => {
      await deleteById("retreats", id);
    },
  },

  retreatRooms: {
    getAll: async (): Promise<RetreatRoom[]> => {
      return selectMany<RetreatRoom>("select * from `retreat_rooms`");
    },

    getByRetreatId: async (retreatId: number): Promise<RetreatRoom[]> => {
      return selectMany<RetreatRoom>(
        "select * from `retreat_rooms` where retreat_id = ?",
        [retreatId]
      );
    },

    getByRoomId: async (roomId: number): Promise<RetreatRoom[]> => {
      return selectMany<RetreatRoom>(
        "select * from `retreat_rooms` where room_id = ?",
        [roomId]
      );
    },

    create: async (retreatRoom: CreateRetreatRoom): Promise<RetreatRoom> => {
      return insertById<RetreatRoom>("retreat_rooms", retreatRoom, retreatRoomColumns);
    },

    update: async (id: number, changes: UpdateRetreatRoom): Promise<RetreatRoom> => {
      return updateById<RetreatRoom>("retreat_rooms", id, changes, retreatRoomColumns);
    },

    delete: async (id: number): Promise<void> => {
      await deleteById("retreat_rooms", id);
    },
  },

  guests: {
    getAll: async (): Promise<Guest[]> => {
      return selectMany<Guest>("select * from `guests` order by name");
    },

    getById: async (id: number): Promise<Guest | null> => {
      return selectOne<Guest>("select * from `guests` where id = ? limit 1", [id]);
    },

    getByRetreatId: async (retreatId: number): Promise<Guest[]> => {
      return selectMany<Guest>(
        "select * from `guests` where retreat_id = ? order by name",
        [retreatId]
      );
    },

    getByRoomId: async (roomId: number): Promise<Guest[]> => {
      return selectMany<Guest>(
        "select * from `guests` where room_id = ? order by name",
        [roomId]
      );
    },

    create: async (
      guest: CreateGuest,
      status?: CreateGuestStatusForNewGuest
    ): Promise<Guest> => {
      if (!status) {
        return insertById<Guest>("guests", guest, guestColumns);
      }

      const connection = await getMariaDbPool().getConnection();

      try {
        await connection.beginTransaction();
        const createdGuest = await insertByIdWithConnection<Guest>(
          connection,
          "guests",
          guest,
          guestColumns
        );
        await insertByIdWithConnection<GuestStatus>(
          connection,
          "guest_statuses",
          { ...status, guest_id: createdGuest.id },
          guestStatusColumns
        );
        await connection.commit();
        return createdGuest;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    update: async (
      id: number,
      changes: UpdateGuest,
      status?: CreateGuestStatus
    ): Promise<Guest> => {
      if (!status) {
        return updateById<Guest>("guests", id, changes, guestColumns);
      }

      const connection = await getMariaDbPool().getConnection();

      try {
        await connection.beginTransaction();
        const updatedGuest = await updateByIdWithConnection<Guest>(
          connection,
          "guests",
          id,
          changes,
          guestColumns
        );
        await insertByIdWithConnection<GuestStatus>(
          connection,
          "guest_statuses",
          status,
          guestStatusColumns
        );
        await connection.commit();
        return updatedGuest;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    swapRooms: async (data: SwapGuestRoomsData): Promise<SwapGuestRoomsResult> => {
      const connection = await getMariaDbPool().getConnection();

      try {
        await connection.beginTransaction();
        const firstGuest = await updateByIdWithConnection<Guest>(
          connection,
          "guests",
          data.firstGuestId,
          data.firstGuestChanges,
          guestColumns
        );
        const secondGuest = await updateByIdWithConnection<Guest>(
          connection,
          "guests",
          data.secondGuestId,
          data.secondGuestChanges,
          guestColumns
        );
        await insertByIdWithConnection<GuestStatus>(
          connection,
          "guest_statuses",
          data.firstStatus,
          guestStatusColumns
        );
        await insertByIdWithConnection<GuestStatus>(
          connection,
          "guest_statuses",
          data.secondStatus,
          guestStatusColumns
        );
        await connection.commit();

        return { firstGuest, secondGuest };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    delete: async (id: number): Promise<void> => {
      await deleteById("guests", id);
    },
  },

  guestStatuses: {
    getByRetreatId: async (retreatId: number): Promise<GuestStatus[]> => {
      return selectMany<GuestStatus>(
        "select * from `guest_statuses` where retreat_id = ? order by changed_at desc, id desc",
        [retreatId]
      );
    },

    create: async (guestStatus: CreateGuestStatus): Promise<GuestStatus> => {
      return insertById<GuestStatus>("guest_statuses", guestStatus, guestStatusColumns);
    },
  },

  taxiRides: {
    getAll: async (): Promise<TaxiRide[]> => {
      return selectMany<TaxiRide>(
        "select * from `taxi_rides` order by arrival_datetime"
      );
    },

    getById: async (id: number): Promise<TaxiRide | null> => {
      return selectOne<TaxiRide>(
        "select * from `taxi_rides` where id = ? limit 1",
        [id]
      );
    },

    getByRetreatId: async (retreatId: number): Promise<TaxiRide[]> => {
      return selectMany<TaxiRide>(
        "select * from `taxi_rides` where retreat_id = ? order by arrival_datetime",
        [retreatId]
      );
    },

    createRides: async (
      retreatId: number,
      rides: CreateTaxiRideBatch[]
    ): Promise<TaxiRide[]> => {
      const connection = await getMariaDbPool().getConnection();

      try {
        await connection.beginTransaction();
        await connection.execute<RowDataPacket[]>(
          "select id from `retreats` where id = ? for update",
          [retreatId]
        );
        await connection.execute<ResultSetHeader>(
          `delete tg from \`taxi_guests\` tg
           inner join \`taxi_rides\` tr on tr.id = tg.ride_id
           where tr.retreat_id = ?`,
          [retreatId]
        );
        await connection.execute<ResultSetHeader>(
          "delete from `taxi_rides` where retreat_id = ?",
          [retreatId]
        );

        const createdRides: TaxiRide[] = [];

        for (const ride of rides) {
          const createdRide = await insertByIdWithConnection<TaxiRide>(
            connection,
            "taxi_rides",
            {
              retreat_id: retreatId,
              arrival_datetime: ride.arrival_datetime,
              driver_name: ride.driver_name,
            },
            taxiRideColumns
          );

          for (const guest of ride.guests) {
            await insertByIdWithConnection<TaxiGuest>(
              connection,
              "taxi_guests",
              {
                ride_id: createdRide.id,
                guest_id: guest.guest_id,
                unbooked_guest_name: guest.unbooked_guest_name,
              },
              taxiGuestColumns
            );
          }

          createdRides.push(createdRide);
        }

        await connection.commit();
        return createdRides;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    create: async (taxiRide: CreateTaxiRide): Promise<TaxiRide> => {
      return insertById<TaxiRide>("taxi_rides", taxiRide, taxiRideColumns);
    },

    update: async (id: number, changes: UpdateTaxiRide): Promise<TaxiRide> => {
      return updateById<TaxiRide>("taxi_rides", id, changes, taxiRideColumns);
    },

    delete: async (id: number): Promise<void> => {
      await deleteById("taxi_rides", id);
    },
  },

  taxiGuests: {
    getAll: async (): Promise<TaxiGuest[]> => {
      return selectMany<TaxiGuest>("select * from `taxi_guests`");
    },

    getByRideId: async (rideId: number): Promise<TaxiGuest[]> => {
      return selectMany<TaxiGuest>(
        "select * from `taxi_guests` where ride_id = ?",
        [rideId]
      );
    },

    getByRideIds: async (rideIds: number[]): Promise<TaxiGuest[]> => {
      if (rideIds.length === 0) {
        return [];
      }

      const placeholders = rideIds.map(() => "?").join(", ");
      return selectMany<TaxiGuest>(
        `select * from \`taxi_guests\` where ride_id in (${placeholders})`,
        rideIds
      );
    },

    getByGuestId: async (guestId: number): Promise<TaxiGuest[]> => {
      return selectMany<TaxiGuest>(
        "select * from `taxi_guests` where guest_id = ?",
        [guestId]
      );
    },

    create: async (taxiGuest: CreateTaxiGuest): Promise<TaxiGuest> => {
      return insertById<TaxiGuest>("taxi_guests", taxiGuest, taxiGuestColumns);
    },

    update: async (id: number, changes: UpdateTaxiGuest): Promise<TaxiGuest> => {
      return updateById<TaxiGuest>("taxi_guests", id, changes, taxiGuestColumns);
    },

    delete: async (id: number): Promise<void> => {
      await deleteById("taxi_guests", id);
    },
  },
};

export default mariaDbServer;
