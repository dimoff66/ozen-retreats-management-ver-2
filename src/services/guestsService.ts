import db from "./database";
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
    return db.guests.create(guest);
  },

  updateGuest: async (id: number, changes: UpdateGuest): Promise<Guest> => {
    return db.guests.update(id, changes);
  },

  deleteGuest: async (id: number): Promise<void> => {
    return db.guests.delete(id);
  },
};

export default guestsService;