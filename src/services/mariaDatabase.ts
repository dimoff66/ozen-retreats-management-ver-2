import type {
  CreateGuest,
  CreateGuestStatus,
  CreateHouse,
  CreateHouseMap,
  CreateRetreat,
  CreateRetreatRoom,
  CreateRoom,
  CreateTaxiGuest,
  CreateTaxiRide,
  CreateUser,
  DatabaseAdapter,
  Guest,
  GuestStatus,
  House,
  HouseMap,
  Retreat,
  RetreatRoom,
  Role,
  Room,
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
} from "./database";

type MariaDbResponse<T> = {
  data?: T;
  error?: string;
};

async function callMariaDb<T>(
  entity: string,
  action: string,
  args: unknown[] = []
): Promise<T> {
  const response = await fetch("/api/mariadb", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity, action, args }),
    cache: "no-store",
  });
  const payload = await response.json() as MariaDbResponse<T>;

  if (!response.ok) {
    throw new Error(
      `MariaDB ${entity}.${action}: ${payload.error ?? response.statusText}`
    );
  }

  return payload.data as T;
}

const mariaDb = {
  roles: {
    getAll: async (): Promise<Role[]> => {
      return callMariaDb<Role[]>("roles", "getAll");
    },

    getByName: async (roleName: string): Promise<Role | null> => {
      return callMariaDb<Role | null>("roles", "getByName", [roleName]);
    },
  },

  users: {
    getAll: async (): Promise<User[]> => {
      return callMariaDb<User[]>("users", "getAll");
    },

    getById: async (id: number): Promise<User | null> => {
      return callMariaDb<User | null>("users", "getById", [id]);
    },

    getByLogin: async (login: string): Promise<User | null> => {
      return callMariaDb<User | null>("users", "getByLogin", [login]);
    },

    create: async (user: CreateUser): Promise<User> => {
      return callMariaDb<User>("users", "create", [user]);
    },

    update: async (id: number, changes: UpdateUser): Promise<User> => {
      return callMariaDb<User>("users", "update", [id, changes]);
    },

    delete: async (id: number): Promise<void> => {
      await callMariaDb<null>("users", "delete", [id]);
    },
  },

  houses: {
    getAll: async (): Promise<House[]> => {
      return callMariaDb<House[]>("houses", "getAll");
    },

    getById: async (id: number): Promise<House | null> => {
      return callMariaDb<House | null>("houses", "getById", [id]);
    },

    getByParentId: async (parentId: number): Promise<House[]> => {
      return callMariaDb<House[]>("houses", "getByParentId", [parentId]);
    },

    create: async (house: CreateHouse): Promise<House> => {
      return callMariaDb<House>("houses", "create", [house]);
    },

    update: async (id: number, changes: UpdateHouse): Promise<House> => {
      return callMariaDb<House>("houses", "update", [id, changes]);
    },

    delete: async (id: number): Promise<void> => {
      await callMariaDb<null>("houses", "delete", [id]);
    },
  },

  rooms: {
    getAll: async (): Promise<Room[]> => {
      return callMariaDb<Room[]>("rooms", "getAll");
    },

    getById: async (id: number): Promise<Room | null> => {
      return callMariaDb<Room | null>("rooms", "getById", [id]);
    },

    getByHouseId: async (houseId: number): Promise<Room[]> => {
      return callMariaDb<Room[]>("rooms", "getByHouseId", [houseId]);
    },

    create: async (room: CreateRoom): Promise<Room> => {
      return callMariaDb<Room>("rooms", "create", [room]);
    },

    update: async (id: number, changes: UpdateRoom): Promise<Room> => {
      return callMariaDb<Room>("rooms", "update", [id, changes]);
    },

    delete: async (id: number): Promise<void> => {
      await callMariaDb<null>("rooms", "delete", [id]);
    },
  },

  houseMaps: {
    getAll: async (): Promise<HouseMap[]> => {
      return callMariaDb<HouseMap[]>("houseMaps", "getAll");
    },

    getById: async (id: number): Promise<HouseMap | null> => {
      return callMariaDb<HouseMap | null>("houseMaps", "getById", [id]);
    },

    getByHouseId: async (houseId: number): Promise<HouseMap | null> => {
      return callMariaDb<HouseMap | null>("houseMaps", "getByHouseId", [houseId]);
    },

    create: async (houseMap: CreateHouseMap): Promise<HouseMap> => {
      return callMariaDb<HouseMap>("houseMaps", "create", [houseMap]);
    },

    update: async (id: number, changes: UpdateHouseMap): Promise<HouseMap> => {
      return callMariaDb<HouseMap>("houseMaps", "update", [id, changes]);
    },

    delete: async (id: number): Promise<void> => {
      await callMariaDb<null>("houseMaps", "delete", [id]);
    },
  },

  retreats: {
    getAll: async (): Promise<Retreat[]> => {
      return callMariaDb<Retreat[]>("retreats", "getAll");
    },

    getById: async (id: number): Promise<Retreat | null> => {
      return callMariaDb<Retreat | null>("retreats", "getById", [id]);
    },

    getActive: async (): Promise<Retreat[]> => {
      return callMariaDb<Retreat[]>("retreats", "getActive");
    },

    create: async (retreat: CreateRetreat): Promise<Retreat> => {
      return callMariaDb<Retreat>("retreats", "create", [retreat]);
    },

    update: async (id: number, changes: UpdateRetreat): Promise<Retreat> => {
      return callMariaDb<Retreat>("retreats", "update", [id, changes]);
    },

    delete: async (id: number): Promise<void> => {
      await callMariaDb<null>("retreats", "delete", [id]);
    },
  },

  retreatRooms: {
    getAll: async (): Promise<RetreatRoom[]> => {
      return callMariaDb<RetreatRoom[]>("retreatRooms", "getAll");
    },

    getByRetreatId: async (retreatId: number): Promise<RetreatRoom[]> => {
      return callMariaDb<RetreatRoom[]>("retreatRooms", "getByRetreatId", [retreatId]);
    },

    getByRoomId: async (roomId: number): Promise<RetreatRoom[]> => {
      return callMariaDb<RetreatRoom[]>("retreatRooms", "getByRoomId", [roomId]);
    },

    create: async (retreatRoom: CreateRetreatRoom): Promise<RetreatRoom> => {
      return callMariaDb<RetreatRoom>("retreatRooms", "create", [retreatRoom]);
    },

    update: async (id: number, changes: UpdateRetreatRoom): Promise<RetreatRoom> => {
      return callMariaDb<RetreatRoom>("retreatRooms", "update", [id, changes]);
    },

    delete: async (id: number): Promise<void> => {
      await callMariaDb<null>("retreatRooms", "delete", [id]);
    },
  },

  guests: {
    getAll: async (): Promise<Guest[]> => {
      return callMariaDb<Guest[]>("guests", "getAll");
    },

    getById: async (id: number): Promise<Guest | null> => {
      return callMariaDb<Guest | null>("guests", "getById", [id]);
    },

    getByRetreatId: async (retreatId: number): Promise<Guest[]> => {
      return callMariaDb<Guest[]>("guests", "getByRetreatId", [retreatId]);
    },

    getByRoomId: async (roomId: number): Promise<Guest[]> => {
      return callMariaDb<Guest[]>("guests", "getByRoomId", [roomId]);
    },

    create: async (guest: CreateGuest): Promise<Guest> => {
      return callMariaDb<Guest>("guests", "create", [guest]);
    },

    update: async (id: number, changes: UpdateGuest): Promise<Guest> => {
      return callMariaDb<Guest>("guests", "update", [id, changes]);
    },

    delete: async (id: number): Promise<void> => {
      await callMariaDb<null>("guests", "delete", [id]);
    },
  },

  guestStatuses: {
    getByRetreatId: async (retreatId: number): Promise<GuestStatus[]> => {
      return callMariaDb<GuestStatus[]>("guestStatuses", "getByRetreatId", [retreatId]);
    },

    create: async (guestStatus: CreateGuestStatus): Promise<GuestStatus> => {
      return callMariaDb<GuestStatus>("guestStatuses", "create", [guestStatus]);
    },
  },

  taxiRides: {
    getAll: async (): Promise<TaxiRide[]> => {
      return callMariaDb<TaxiRide[]>("taxiRides", "getAll");
    },

    getById: async (id: number): Promise<TaxiRide | null> => {
      return callMariaDb<TaxiRide | null>("taxiRides", "getById", [id]);
    },

    getByRetreatId: async (retreatId: number): Promise<TaxiRide[]> => {
      return callMariaDb<TaxiRide[]>("taxiRides", "getByRetreatId", [retreatId]);
    },

    create: async (taxiRide: CreateTaxiRide): Promise<TaxiRide> => {
      return callMariaDb<TaxiRide>("taxiRides", "create", [taxiRide]);
    },

    update: async (id: number, changes: UpdateTaxiRide): Promise<TaxiRide> => {
      return callMariaDb<TaxiRide>("taxiRides", "update", [id, changes]);
    },

    delete: async (id: number): Promise<void> => {
      await callMariaDb<null>("taxiRides", "delete", [id]);
    },
  },

  taxiGuests: {
    getAll: async (): Promise<TaxiGuest[]> => {
      return callMariaDb<TaxiGuest[]>("taxiGuests", "getAll");
    },

    getByRideId: async (rideId: number): Promise<TaxiGuest[]> => {
      return callMariaDb<TaxiGuest[]>("taxiGuests", "getByRideId", [rideId]);
    },

    getByRideIds: async (rideIds: number[]): Promise<TaxiGuest[]> => {
      return callMariaDb<TaxiGuest[]>("taxiGuests", "getByRideIds", [rideIds]);
    },

    getByGuestId: async (guestId: number): Promise<TaxiGuest[]> => {
      return callMariaDb<TaxiGuest[]>("taxiGuests", "getByGuestId", [guestId]);
    },

    create: async (taxiGuest: CreateTaxiGuest): Promise<TaxiGuest> => {
      return callMariaDb<TaxiGuest>("taxiGuests", "create", [taxiGuest]);
    },

    update: async (id: number, changes: UpdateTaxiGuest): Promise<TaxiGuest> => {
      return callMariaDb<TaxiGuest>("taxiGuests", "update", [id, changes]);
    },

    delete: async (id: number): Promise<void> => {
      await callMariaDb<null>("taxiGuests", "delete", [id]);
    },
  },

  houseMapImages: {
    upload: async (houseId: number, file: File): Promise<string> => {
      const formData = new FormData();
      formData.append("houseId", String(houseId));
      formData.append("file", file);

      const response = await fetch("/api/mariadb/house-map-images", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json() as MariaDbResponse<string>;

      if (!response.ok) {
        throw new Error(
          `MariaDB houseMapImages.upload: ${payload.error ?? response.statusText}`
        );
      }

      return payload.data as string;
    },
  },
} satisfies DatabaseAdapter;

export default mariaDb;
