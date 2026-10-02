import db from "./database";
import type { Guest, GuestStatus, RetreatRoom, Room } from "./database";
import guestStatusesService from "./guestStatusesService";

const retreatRoomsService = {
  getRetreatRooms: async (retreatId: number): Promise<RetreatRoom[]> => db.retreatRooms.getByRetreatId(retreatId),
  getSelectableRooms: (
    rooms: Room[],
    retreatRooms: RetreatRoom[],
    guests: Guest[],
    statuses: GuestStatus[],
    guestId: number | null,
  ): Room[] => {
    const latest = guestStatusesService.getLatestStatuses(statuses);
    return rooms.filter((room) => {
      const allocation = retreatRooms.find((item) => item.room_id === room.id);
      const occupants = guests.filter((guest) => guest.room_id === room.id
        && guest.id !== guestId && latest.get(guest.id)?.status !== "not_coming");
      return room.is_available && !!allocation && occupants.length < allocation.max_guests;
    });
  },
};

export default retreatRoomsService;
