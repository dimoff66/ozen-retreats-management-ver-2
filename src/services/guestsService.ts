import db from "./database";
import { getAvailableGuestActions } from "./guestActionsService";
import type { GuestAction } from "./guestActionsService";
import roomsService from "./roomsService";
import type {
  CreateGuest,
  CreateGuestStatus,
  CreateGuestStatusForNewGuest,
  Guest,
  SwapGuestRoomsResult,
  UpdateGuest,
} from "./database";
import type { GuestStatusValue } from "./guestStatusesService";

export type GuestMenuAction = {
  id: GuestAction;
  caption: string;
  action: () => void;
};

const guestActionCaptions: Record<GuestAction, string> = {
  move_room: "Change room",
  swap_room: "Swap rooms",
  mark_arrived: "Mark arrived",
  not_coming: "Not coming",
  check_in: "Check in",
  cancel_check_in: "Cancel check-in",
  cancel_arrival: "Cancel arrival",
};

const guestsService = {
  getGuests: async (): Promise<Guest[]> => {
    return db.guests.getAll();
  },

  getGuestById: async (id: number): Promise<Guest | null> => {
    return db.guests.getById(id);
  },

  getGuestsByRetreatId: async (retreatId: number): Promise<Guest[]> => {
    return db.guests.getByRetreatId(retreatId);
  },

  getGuestsByRoomId: async (roomId: number): Promise<Guest[]> => {
    return db.guests.getByRoomId(roomId);
  },

  getGuestMenuActions: (
    guest: Guest,
    role: string,
    status: GuestStatusValue,
    onAction: (guest: Guest, action: GuestAction) => void
  ): GuestMenuAction[] => {
    return getAvailableGuestActions(role, status, guest.room_id !== null).map((id) => ({
      id,
      caption: id === "move_room" && guest.room_id === null
        ? "Assign room"
        : guestActionCaptions[id],
      action: () => onAction(guest, id),
    }));
  },

  createGuest: async (guest: CreateGuest): Promise<Guest> => {
    const data = normalizeGuest(guest);
    const status = data.room_id
      ? await prepareBookedStatus(data.retreat_id, data.room_id)
      : undefined;

    return db.guests.create(data, status);
  },

  updateGuest: async (id: number, changes: UpdateGuest): Promise<Guest> => {
    const currentGuest = await db.guests.getById(id);

    if (!currentGuest) {
      throw new Error("Guest no longer exists. Reload the list.");
    }

    const data = normalizeGuest({
      retreat_id: changes.retreat_id ?? currentGuest.retreat_id,
      name: changes.name ?? currentGuest.name,
      is_organizer: changes.is_organizer ?? currentGuest.is_organizer,
      arrival_date: changes.arrival_date ?? currentGuest.arrival_date,
      diet_notes: changes.diet_notes ?? currentGuest.diet_notes,
      room_id: changes.room_id ?? currentGuest.room_id,
    });
    const roomChanged = currentGuest.room_id !== data.room_id;
    const status = roomChanged && data.room_id
      ? {
          ...(await prepareBookedStatus(data.retreat_id, data.room_id)),
          guest_id: id,
        }
      : undefined;

    return db.guests.update(id, data, status);
  },

  swapRooms: async (firstGuestId: number, secondGuestId: number): Promise<SwapGuestRoomsResult> => {
    if (firstGuestId === secondGuestId) {
      throw new Error("Choose another guest for the room swap.");
    }

    const [firstGuest, secondGuest] = await Promise.all([
      db.guests.getById(firstGuestId),
      db.guests.getById(secondGuestId),
    ]);

    if (!firstGuest || !secondGuest) {
      throw new Error("One of the guests no longer exists. Reload the list.");
    }

    if (firstGuest.retreat_id !== secondGuest.retreat_id) {
      throw new Error("Guests from different retreats cannot swap rooms.");
    }

    if (!firstGuest.room_id || !secondGuest.room_id) {
      throw new Error("Both guests must have rooms before swapping.");
    }

    if (firstGuest.room_id === secondGuest.room_id) {
      throw new Error("Guests already have the same room.");
    }

    const [firstStatusData, secondStatusData] = await Promise.all([
      prepareBookedStatus(firstGuest.retreat_id, secondGuest.room_id),
      prepareBookedStatus(secondGuest.retreat_id, firstGuest.room_id),
    ]);
    const firstStatus: CreateGuestStatus = {
      ...firstStatusData,
      guest_id: firstGuest.id,
    };
    const secondStatus: CreateGuestStatus = {
      ...secondStatusData,
      guest_id: secondGuest.id,
    };

    return db.guests.swapRooms({
      firstGuestId: firstGuest.id,
      firstGuestChanges: { room_id: secondGuest.room_id },
      firstStatus,
      secondGuestId: secondGuest.id,
      secondGuestChanges: { room_id: firstGuest.room_id },
      secondStatus,
    });
  },

  deleteGuest: async (id: number): Promise<void> => {
    return db.guests.delete(id);
  },
};

async function prepareBookedStatus(
  retreatId: number,
  roomId: number
): Promise<CreateGuestStatusForNewGuest> {
  const room = await db.rooms.getById(roomId);

  if (!room) {
    throw new Error("Room no longer exists.");
  }

  const house = await db.houses.getById(room.house_id);

  if (!house) {
    throw new Error("House no longer exists.");
  }

  const admin = await db.users.getByLogin("admin");

  if (!admin) {
    throw new Error("Development admin user was not found.");
  }

  return {
    retreat_id: retreatId,
    status: "booked",
    room: roomsService.getRoomDisplayName(room, house),
    updated_by: admin.id,
  };
}

function normalizeGuest(guest: CreateGuest): CreateGuest {
  const name = guest.name.trim();

  if (!name) {
    throw new Error("Enter a guest name.");
  }

  return {
    retreat_id: guest.retreat_id,
    name,
    is_organizer: guest.is_organizer ?? false,
    arrival_date: guest.arrival_date || null,
    diet_notes: guest.diet_notes?.trim() || null,
    room_id: guest.room_id ?? null,
  };
}

export default guestsService;
