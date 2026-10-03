import db from "./database";
import guestStatusesService from "./guestStatusesService";
import roomsService from "./roomsService";
import type { CreateGuest, Guest, UpdateGuest } from "./database";

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

  createGuest: async (guest: CreateGuest): Promise<Guest> => {
    const data = normalizeGuest(guest);
    const createdGuest = await db.guests.create(data);

    if (createdGuest.room_id) {
      await createBookedStatus(createdGuest.id, createdGuest.room_id);
    }

    return createdGuest;
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
    const updatedGuest = await db.guests.update(id, data);

    if (roomChanged && updatedGuest.room_id) {
      await createBookedStatus(updatedGuest.id, updatedGuest.room_id);
    }

    return updatedGuest;
  },

  deleteGuest: async (id: number): Promise<void> => {
    return db.guests.delete(id);
  },
};

async function createBookedStatus(guestId: number, roomId: number): Promise<void> {
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

  const roomDisplayName = roomsService.getRoomDisplayName(room, house);

  await guestStatusesService.createStatus(
    guestId,
    "booked",
    roomDisplayName,
    admin.id
  );
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