import db from "./database";
import type { GuestStatus } from "./database";

export type GuestStatusValue =
  | "booked"
  | "arrived"
  | "checked_in"
  | "not_coming";

export type LatestGuestStatus = {
  guestId: number;
  status: GuestStatusValue;
  room: string | null;
  changedAt: string;
};

export function getPreviousGuestStatuses(statuses: GuestStatus[]): Map<number, GuestStatus> {
  const previousStatuses = new Map<number, GuestStatus>();
  const latestByGuest = new Map<number, GuestStatus>();
  const chronologicalStatuses = [...statuses].sort((left, right) => {
    const timeDifference = Date.parse(left.changed_at) - Date.parse(right.changed_at);

    return timeDifference || left.id - right.id;
  });

  chronologicalStatuses.forEach((status) => {
    const previousStatus = latestByGuest.get(status.guest_id);

    if (previousStatus) {
      previousStatuses.set(status.id, previousStatus);
    }

    latestByGuest.set(status.guest_id, status);
  });

  return previousStatuses;
}

export function getGuestStatusHistoryMessage(
  status: GuestStatus,
  previousStatus: GuestStatus | undefined,
  guestName: string,
  userName: string
): string {
  if (status.status === "arrived" && previousStatus?.status === "checked_in") {
    return `${userName} cancelled check-in for ${guestName}`;
  }

  if (status.status === "booked" && previousStatus?.status === "arrived") {
    return `${userName} cancelled arrival for ${guestName}`;
  }

  if (status.status === "booked") {
    if (status.room && status.room !== previousStatus?.room) {
      return `${userName} assigned room ${status.room} to ${guestName}`;
    }

    return `${userName} confirmed the booking for ${guestName}`;
  }

  if (status.status === "checked_in") {
    const roomDescription = status.room ? ` to room ${status.room}` : "";

    return `${userName} checked in ${guestName}${roomDescription}`;
  }

  if (status.status === "arrived") {
    return `${userName} registered the arrival of ${guestName}`;
  }

  if (status.status === "not_coming") {
    return `${userName} marked ${guestName} as not coming`;
  }

  return `${userName} updated the status for ${guestName} to ${status.status}`;
}

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