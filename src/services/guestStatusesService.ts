import db from "./database";
import type { GuestStatus } from "./database";

const guestStatusesService = {
  getGuestStatuses: async (): Promise<GuestStatus[]> => {
    return db.guestStatuses.getAll();
  },

  getGuestStatusHistory: async (guestId: number): Promise<GuestStatus[]> => {
    return db.guestStatuses.getByGuestId(guestId);
  },

  getLatestGuestStatus: async (guestId: number): Promise<GuestStatus | null> => {
    return db.guestStatuses.getLatestByGuestId(guestId);
  },

  getLatestStatuses: (statuses: GuestStatus[]): Map<number, GuestStatus> => {
    const latestStatuses = new Map<number, GuestStatus>();

    statuses.forEach((status) => {
      const currentStatus = latestStatuses.get(status.guest_id);

      if (!currentStatus) {
        latestStatuses.set(status.guest_id, status);
        return;
      }

      const currentDate = new Date(currentStatus.changed_at).getTime();
      const statusDate = new Date(status.changed_at).getTime();

      if (statusDate > currentDate) {
        latestStatuses.set(status.guest_id, status);
      }
    });

    return latestStatuses;
  },
};

export default guestStatusesService;