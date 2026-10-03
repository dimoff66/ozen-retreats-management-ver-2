import db from "./database";
import type { Guest, RetreatRoom, Room } from "./database";
import type { LatestGuestStatus } from "./guestStatusesService";

export type RetreatRoomSetting = {
  roomId: number;
  isAvailable: boolean;
  maxGuests: number;
};

const retreatRoomsService = {
  getRetreatRooms: async (retreatId: number): Promise<RetreatRoom[]> => {
    return db.retreatRooms.getByRetreatId(retreatId);
  },

  saveRetreatRooms: async (
    retreatId: number,
    settings: RetreatRoomSetting[]
  ): Promise<void> => {
    const currentRetreatRooms = await db.retreatRooms.getByRetreatId(retreatId);

    const operations = settings.map(async (setting) => {
      const current = currentRetreatRooms.find(
        (item) => item.room_id === setting.roomId
      );

      if (!setting.isAvailable) {
        if (current) {
          await db.retreatRooms.delete(current.id);
        }

        return;
      }

      const maxGuests = Math.max(1, setting.maxGuests);

      if (current) {
        if (current.max_guests !== maxGuests) {
          await db.retreatRooms.update(current.id, {
            max_guests: maxGuests,
          });
        }

        return;
      }

      await db.retreatRooms.create({
        retreat_id: retreatId,
        room_id: setting.roomId,
        max_guests: maxGuests,
      });
    });

    await Promise.all(operations);
  },

  getSelectableRooms: (
    rooms: Room[],
    retreatRooms: RetreatRoom[],
    guests: Guest[],
    latestStatuses: Map<number, LatestGuestStatus>,
    guestId: number | null
  ): Room[] => {
    return rooms.filter((room) => {
      const retreatRoom = retreatRooms.find(
        (item) => item.room_id === room.id
      );

      if (!room.is_available || !retreatRoom) {
        return false;
      }

      const occupants = guests.filter((guest) => {
        if (guest.room_id !== room.id) {
          return false;
        }

        if (guest.id === guestId) {
          return false;
        }

        const status = latestStatuses.get(guest.id);

        return status?.status !== "not_coming";
      });

      return occupants.length < retreatRoom.max_guests;
    });
  },
};

export default retreatRoomsService;