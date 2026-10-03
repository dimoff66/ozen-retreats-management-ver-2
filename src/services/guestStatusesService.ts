import db from "./database";
import type { GuestStatus } from "./database";

export type GuestStatusValue =
  | "booked"
  | "checked_in"
  | "registered"
  | "not_coming";

export type LatestGuestStatus = {
  guestId: number;
  status: GuestStatusValue;
  room: string | null;
  changedAt: string;
};

const guestStatusesService = {
  getGuestStatusesByRetreatId: async (retreatId: number): Promise<GuestStatus[]> => {
    return db.guestStatuses.getByRetreatId(retreatId);
  },

  getLatestForRetreat: async (retreatId: number): Promise<Map<number, LatestGuestStatus>> => {
    const statuses = await db.guestStatuses.getByRetreatId(retreatId);
    const latestStatuses = new Map<number, LatestGuestStatus>();

    statuses.forEach((status) => {
      if (latestStatuses.has(status.guest_id)) {
        return;
      }

      latestStatuses.set(status.guest_id, {
        guestId: status.guest_id,
        status: status.status as GuestStatusValue,
        room: status.room,
        changedAt: status.changed_at,
      });
    });

    return latestStatuses;
  },

  createStatus: async (
    guestId: number,
    status: GuestStatusValue,
    room: string | null,
    updatedBy: number
  ): Promise<GuestStatus> => {
    return db.guestStatuses.create({
      guest_id: guestId,
      status,
      room,
      updated_by: updatedBy,
    });
  },
};

export default guestStatusesService;