import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/*
|--------------------------------------------------------------------------
| Database entity types
|--------------------------------------------------------------------------
*/

export type User = {
  id: number;
  name: string;
  login: string;
  password: string;
  role: string;
  retreat_id: number | null;
  created_at: string;
};

export type Role = {
  role_name: string;
};

export type House = {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
};

export type Room = {
  id: number;
  room_number: string;
  house_id: number;
  is_available: boolean;
  created_at: string;
};

export type HouseMap = {
  id: number;
  house_id: number;
  bg_image_url: string | null;
  room_positions: unknown;
  updated_at: string;
};

export type Retreat = {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  version?: number;
};

export type RetreatRoom = {
  id: number;
  retreat_id: number;
  room_id: number;
  max_guests: number;
};

export type Guest = {
  id: number;
  retreat_id: number;
  name: string;
  is_organizer: boolean;
  arrival_date: string | null;
  diet_notes: string | null;
  room_id: number | null;
  created_at: string;
};

export type GuestStatus = {
  id: number;
  retreat_id: number;
  guest_id: number;
  status: string;
  room: string | null;
  updated_by: number;
  changed_at: string;
};

export type TaxiRide = {
  id: number;
  retreat_id: number;
  arrival_datetime: string;
  driver_name: string | null;
  created_at: string;
};

export type TaxiGuest = {
  id: number;
  ride_id: number;
  guest_id: number | null;
  unbooked_guest_name: string | null;
};

/*
|--------------------------------------------------------------------------
| Create / update types
|--------------------------------------------------------------------------
*/

export type CreateUser = {
  name: string;
  login: string;
  password: string;
  role: string;
  retreat_id?: number | null;
};

export type UpdateUser = Partial<CreateUser>;

export type CreateHouse = {
  name: string;
  parent_id?: number | null;
};

export type UpdateHouse = Partial<CreateHouse>;

export type CreateRoom = {
  room_number: string;
  house_id: number;
  is_available?: boolean;
};

export type UpdateRoom = Partial<CreateRoom>;

export type CreateHouseMap = {
  house_id: number;
  bg_image_url?: string | null;
  room_positions?: unknown;
};

export type UpdateHouseMap = Partial<CreateHouseMap>;

export type CreateRetreat = {
  title: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
};

export type UpdateRetreat = Partial<CreateRetreat>;

export type CreateRetreatRoom = {
  retreat_id: number;
  room_id: number;
  max_guests?: number;
};

export type UpdateRetreatRoom = Partial<CreateRetreatRoom>;

export type CreateGuest = {
  retreat_id: number;
  name: string;
  is_organizer?: boolean;
  arrival_date?: string | null;
  diet_notes?: string | null;
  room_id?: number | null;
};

export type UpdateGuest = Partial<CreateGuest>;

export type CreateGuestStatus = {
  retreat_id: number;
  guest_id: number;
  status: string;
  room: string | null;
  updated_by: number;
};

export type CreateTaxiRide = {
  retreat_id: number;
  arrival_datetime: string;
  driver_name?: string | null;
};

export type UpdateTaxiRide = Partial<CreateTaxiRide>;

export type CreateTaxiGuest = {
  ride_id: number;
  guest_id?: number | null;
  unbooked_guest_name?: string | null;
};

export type UpdateTaxiGuest = Partial<CreateTaxiGuest>;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function throwDatabaseError(
  operation: string,
  error: PostgrestError | null
): never {
  const message = error?.message ?? "Unknown database error";

  throw new Error(`${operation}: ${message}`);
}

/*
|--------------------------------------------------------------------------
| Database adapter
|--------------------------------------------------------------------------
*/

const db = {
  /*
  |--------------------------------------------------------------------------
  | Roles
  |--------------------------------------------------------------------------
  */

  roles: {
    getAll: async (): Promise<Role[]> => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("role_name");

      if (error) {
        throwDatabaseError("Failed to get roles", error);
      }

      return data as Role[];
    },

    getByName: async (roleName: string): Promise<Role | null> => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("role_name", roleName)
        .maybeSingle();

      if (error) {
        throwDatabaseError("Failed to get role", error);
      }

      return data as Role | null;
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Users
  |--------------------------------------------------------------------------
  */

  users: {
    getAll: async (): Promise<User[]> => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("name");

      if (error) {
        throwDatabaseError("Failed to get users", error);
      }

      return data as User[];
    },

    getById: async (id: number): Promise<User | null> => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throwDatabaseError("Failed to get user", error);
      }

      return data as User | null;
    },

    getByLogin: async (login: string): Promise<User | null> => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("login", login)
        .maybeSingle();

      if (error) {
        throwDatabaseError("Failed to get user by login", error);
      }

      return data as User | null;
    },

    create: async (user: CreateUser): Promise<User> => {
      const { data, error } = await supabase
        .from("users")
        .insert(user)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to create user", error);
      }

      return data as User;
    },

    update: async (
      id: number,
      changes: UpdateUser
    ): Promise<User> => {
      const { data, error } = await supabase
        .from("users")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to update user", error);
      }

      return data as User;
    },

    delete: async (id: number): Promise<void> => {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id);

      if (error) {
        throwDatabaseError("Failed to delete user", error);
      }
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Houses
  |--------------------------------------------------------------------------
  */

  houses: {
    getAll: async (): Promise<House[]> => {
      const { data, error } = await supabase
        .from("houses")
        .select("*")
        .order("id");

      if (error) {
        throwDatabaseError("Failed to get houses", error);
      }

      return data as House[];
    },

    getById: async (id: number): Promise<House | null> => {
      const { data, error } = await supabase
        .from("houses")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throwDatabaseError("Failed to get house", error);
      }

      return data as House | null;
    },

    getByParentId: async (
      parentId: number
    ): Promise<House[]> => {
      const { data, error } = await supabase
        .from("houses")
        .select("*")
        .eq("parent_id", parentId)
        .order("id");

      if (error) {
        throwDatabaseError("Failed to get child houses", error);
      }

      return data as House[];
    },

    create: async (house: CreateHouse): Promise<House> => {
      const { data, error } = await supabase
        .from("houses")
        .insert(house)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to create house", error);
      }

      return data as House;
    },

    update: async (
      id: number,
      changes: UpdateHouse
    ): Promise<House> => {
      const { data, error } = await supabase
        .from("houses")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to update house", error);
      }

      return data as House;
    },

    delete: async (id: number): Promise<void> => {
      const { error } = await supabase
        .from("houses")
        .delete()
        .eq("id", id);

      if (error) {
        throwDatabaseError("Failed to delete house", error);
      }
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Rooms
  |--------------------------------------------------------------------------
  */

  rooms: {
    getAll: async (): Promise<Room[]> => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("room_number");

      if (error) {
        throwDatabaseError("Failed to get rooms", error);
      }

      return data as Room[];
    },

    getById: async (id: number): Promise<Room | null> => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throwDatabaseError("Failed to get room", error);
      }

      return data as Room | null;
    },

    getByHouseId: async (
      houseId: number
    ): Promise<Room[]> => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("house_id", houseId)
        .order("room_number");

      if (error) {
        throwDatabaseError("Failed to get rooms by house", error);
      }

      return data as Room[];
    },

    create: async (room: CreateRoom): Promise<Room> => {
      const { data, error } = await supabase
        .from("rooms")
        .insert(room)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to create room", error);
      }

      return data as Room;
    },

    update: async (
      id: number,
      changes: UpdateRoom
    ): Promise<Room> => {
      const { data, error } = await supabase
        .from("rooms")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to update room", error);
      }

      return data as Room;
    },

    delete: async (id: number): Promise<void> => {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", id);

      if (error) {
        throwDatabaseError("Failed to delete room", error);
      }
    },
  },

  /*
  |--------------------------------------------------------------------------
  | House maps
  |--------------------------------------------------------------------------
  */

  houseMaps: {
    getAll: async (): Promise<HouseMap[]> => {
      const { data, error } = await supabase
        .from("house_maps")
        .select("*");

      if (error) {
        throwDatabaseError("Failed to get house maps", error);
      }

      return data as HouseMap[];
    },

    getById: async (id: number): Promise<HouseMap | null> => {
      const { data, error } = await supabase
        .from("house_maps")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throwDatabaseError("Failed to get house map", error);
      }

      return data as HouseMap | null;
    },

    getByHouseId: async (
      houseId: number
    ): Promise<HouseMap | null> => {
      const { data, error } = await supabase
        .from("house_maps")
        .select("*")
        .eq("house_id", houseId)
        .maybeSingle();

      if (error) {
        throwDatabaseError("Failed to get house map by house", error);
      }

      return data as HouseMap | null;
    },

    create: async (
      houseMap: CreateHouseMap
    ): Promise<HouseMap> => {
      const { data, error } = await supabase
        .from("house_maps")
        .insert(houseMap)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to create house map", error);
      }

      return data as HouseMap;
    },

    update: async (
      id: number,
      changes: UpdateHouseMap
    ): Promise<HouseMap> => {
      const { data, error } = await supabase
        .from("house_maps")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to update house map", error);
      }

      return data as HouseMap;
    },

    delete: async (id: number): Promise<void> => {
      const { error } = await supabase
        .from("house_maps")
        .delete()
        .eq("id", id);

      if (error) {
        throwDatabaseError("Failed to delete house map", error);
      }
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Retreats
  |--------------------------------------------------------------------------
  */

  retreats: {
    getAll: async (): Promise<Retreat[]> => {
      const { data, error } = await supabase
        .from("retreats")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) {
        throwDatabaseError("Failed to get retreats", error);
      }

      return data as Retreat[];
    },

    getById: async (id: number): Promise<Retreat | null> => {
      const { data, error } = await supabase
        .from("retreats")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throwDatabaseError("Failed to get retreat", error);
      }

      return data as Retreat | null;
    },

    getActive: async (): Promise<Retreat[]> => {
      const { data, error } = await supabase
        .from("retreats")
        .select("*")
        .eq("is_active", true)
        .order("start_date", { ascending: true });

      if (error) {
        throwDatabaseError("Failed to get active retreats", error);
      }

      return data as Retreat[];
    },

    create: async (
      retreat: CreateRetreat
    ): Promise<Retreat> => {
      const { data, error } = await supabase
        .from("retreats")
        .insert(retreat)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to create retreat", error);
      }

      return data as Retreat;
    },

    update: async (
      id: number,
      changes: UpdateRetreat
    ): Promise<Retreat> => {
      const { data, error } = await supabase
        .from("retreats")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to update retreat", error);
      }

      return data as Retreat;
    },

    delete: async (id: number): Promise<void> => {
      const { error } = await supabase
        .from("retreats")
        .delete()
        .eq("id", id);

      if (error) {
        throwDatabaseError("Failed to delete retreat", error);
      }
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Retreat rooms
  |--------------------------------------------------------------------------
  */

  retreatRooms: {
    getAll: async (): Promise<RetreatRoom[]> => {
      const { data, error } = await supabase
        .from("retreat_rooms")
        .select("*");

      if (error) {
        throwDatabaseError("Failed to get retreat rooms", error);
      }

      return data as RetreatRoom[];
    },

    getByRetreatId: async (
      retreatId: number
    ): Promise<RetreatRoom[]> => {
      const { data, error } = await supabase
        .from("retreat_rooms")
        .select("*")
        .eq("retreat_id", retreatId);

      if (error) {
        throwDatabaseError(
          "Failed to get retreat rooms by retreat",
          error
        );
      }

      return data as RetreatRoom[];
    },

    getByRoomId: async (
      roomId: number
    ): Promise<RetreatRoom[]> => {
      const { data, error } = await supabase
        .from("retreat_rooms")
        .select("*")
        .eq("room_id", roomId);

      if (error) {
        throwDatabaseError(
          "Failed to get retreat rooms by room",
          error
        );
      }

      return data as RetreatRoom[];
    },

    create: async (
      retreatRoom: CreateRetreatRoom
    ): Promise<RetreatRoom> => {
      const { data, error } = await supabase
        .from("retreat_rooms")
        .insert(retreatRoom)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to create retreat room", error);
      }

      return data as RetreatRoom;
    },

    update: async (
      id: number,
      changes: UpdateRetreatRoom
    ): Promise<RetreatRoom> => {
      const { data, error } = await supabase
        .from("retreat_rooms")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to update retreat room", error);
      }

      return data as RetreatRoom;
    },

    delete: async (id: number): Promise<void> => {
      const { error } = await supabase
        .from("retreat_rooms")
        .delete()
        .eq("id", id);

      if (error) {
        throwDatabaseError("Failed to delete retreat room", error);
      }
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Guests
  |--------------------------------------------------------------------------
  */

  guests: {
    getAll: async (): Promise<Guest[]> => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .order("name");

      if (error) {
        throwDatabaseError("Failed to get guests", error);
      }

      return data as Guest[];
    },

    getById: async (id: number): Promise<Guest | null> => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throwDatabaseError("Failed to get guest", error);
      }

      return data as Guest | null;
    },

    getByRetreatId: async (
      retreatId: number
    ): Promise<Guest[]> => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .eq("retreat_id", retreatId)
        .order("name");

      if (error) {
        throwDatabaseError(
          "Failed to get guests by retreat",
          error
        );
      }

      return data as Guest[];
    },

    getByRoomId: async (
      roomId: number
    ): Promise<Guest[]> => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .eq("room_id", roomId)
        .order("name");

      if (error) {
        throwDatabaseError(
          "Failed to get guests by room",
          error
        );
      }

      return data as Guest[];
    },

    create: async (guest: CreateGuest): Promise<Guest> => {
      const { data, error } = await supabase
        .from("guests")
        .insert(guest)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to create guest", error);
      }

      return data as Guest;
    },

    update: async (
      id: number,
      changes: UpdateGuest
    ): Promise<Guest> => {
      const { data, error } = await supabase
        .from("guests")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to update guest", error);
      }

      return data as Guest;
    },

    delete: async (id: number): Promise<void> => {
      const { error } = await supabase
        .from("guests")
        .delete()
        .eq("id", id);

      if (error) {
        throwDatabaseError("Failed to delete guest", error);
      }
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Guest status history
  |--------------------------------------------------------------------------
  */

  guestStatuses: {
    getByRetreatId: async (retreatId: number): Promise<GuestStatus[]> => {
      const { data, error } = await supabase
        .from("guest_statuses")
        .select("*")
        .eq("retreat_id", retreatId)
        .order("changed_at", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        throwDatabaseError("Failed to get guest statuses by retreat", error);
      }

      return data as GuestStatus[];
    },

    create: async (guestStatus: CreateGuestStatus): Promise<GuestStatus> => {
      const { data, error } = await supabase
        .from("guest_statuses")
        .insert(guestStatus)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to create guest status", error);
      }

      return data as GuestStatus;
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Taxi rides
  |--------------------------------------------------------------------------
  */

  taxiRides: {
    getAll: async (): Promise<TaxiRide[]> => {
      const { data, error } = await supabase
        .from("taxi_rides")
        .select("*")
        .order("arrival_datetime");

      if (error) {
        throwDatabaseError("Failed to get taxi rides", error);
      }

      return data as TaxiRide[];
    },

    getById: async (id: number): Promise<TaxiRide | null> => {
      const { data, error } = await supabase
        .from("taxi_rides")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throwDatabaseError("Failed to get taxi ride", error);
      }

      return data as TaxiRide | null;
    },

    getByRetreatId: async (
      retreatId: number
    ): Promise<TaxiRide[]> => {
      const { data, error } = await supabase
        .from("taxi_rides")
        .select("*")
        .eq("retreat_id", retreatId)
        .order("arrival_datetime");

      if (error) {
        throwDatabaseError(
          "Failed to get taxi rides by retreat",
          error
        );
      }

      return data as TaxiRide[];
    },

    create: async (
      taxiRide: CreateTaxiRide
    ): Promise<TaxiRide> => {
      const { data, error } = await supabase
        .from("taxi_rides")
        .insert(taxiRide)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to create taxi ride", error);
      }

      return data as TaxiRide;
    },

    update: async (
      id: number,
      changes: UpdateTaxiRide
    ): Promise<TaxiRide> => {
      const { data, error } = await supabase
        .from("taxi_rides")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to update taxi ride", error);
      }

      return data as TaxiRide;
    },

    delete: async (id: number): Promise<void> => {
      const { error } = await supabase
        .from("taxi_rides")
        .delete()
        .eq("id", id);

      if (error) {
        throwDatabaseError("Failed to delete taxi ride", error);
      }
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Taxi guests
  |--------------------------------------------------------------------------
  */

  taxiGuests: {
    getAll: async (): Promise<TaxiGuest[]> => {
      const { data, error } = await supabase
        .from("taxi_guests")
        .select("*");

      if (error) {
        throwDatabaseError("Failed to get taxi guests", error);
      }

      return data as TaxiGuest[];
    },

    getByRideId: async (
      rideId: number
    ): Promise<TaxiGuest[]> => {
      const { data, error } = await supabase
        .from("taxi_guests")
        .select("*")
        .eq("ride_id", rideId);

      if (error) {
        throwDatabaseError(
          "Failed to get taxi guests by ride",
          error
        );
      }

      return data as TaxiGuest[];
    },

    getByRideIds: async (rideIds: number[]): Promise<TaxiGuest[]> => {
      if (rideIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("taxi_guests")
        .select("*")
        .in("ride_id", rideIds);

      if (error) {
        throwDatabaseError("Failed to get taxi guests by ride ids", error);
      }

      return data as TaxiGuest[];
    },

    getByGuestId: async (
      guestId: number
    ): Promise<TaxiGuest[]> => {
      const { data, error } = await supabase
        .from("taxi_guests")
        .select("*")
        .eq("guest_id", guestId);

      if (error) {
        throwDatabaseError(
          "Failed to get taxi rides for guest",
          error
        );
      }

      return data as TaxiGuest[];
    },

    create: async (
      taxiGuest: CreateTaxiGuest
    ): Promise<TaxiGuest> => {
      const { data, error } = await supabase
        .from("taxi_guests")
        .insert(taxiGuest)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to create taxi guest", error);
      }

      return data as TaxiGuest;
    },

    update: async (
      id: number,
      changes: UpdateTaxiGuest
    ): Promise<TaxiGuest> => {
      const { data, error } = await supabase
        .from("taxi_guests")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throwDatabaseError("Failed to update taxi guest", error);
      }

      return data as TaxiGuest;
    },

    delete: async (id: number): Promise<void> => {
      const { error } = await supabase
        .from("taxi_guests")
        .delete()
        .eq("id", id);

      if (error) {
        throwDatabaseError("Failed to delete taxi guest", error);
      }
    },
  },

  houseMapImages: {
    upload: async (houseId: number, file: File): Promise<string> => {
      const fileExtension = file.name.split(".").pop() ?? "jpg";
      const filePath = `${houseId}/background.${fileExtension}`;

      const { error } = await supabase.storage
        .from("house-maps")
        .upload(filePath, file, {
          upsert: true,
        });

      if (error) {
        throw new Error(`Failed to upload house map image: ${error.message}`);
      }

      const { data } = supabase.storage
        .from("house-maps")
        .getPublicUrl(filePath);

      return data.publicUrl;
    },
  },
};

export type DatabaseAdapter = typeof db;

export default db;
