import db from "./database";
import type { GuestStatus } from "./database";

export type GuestStatusValue =
  | "booked"
  | "arrived"
  | "checked_in"
  | "not_coming";


const guestStatusLabels: Record<GuestStatusValue, string> = {
  booked: "Booked",
  arrived: "Arrived",
  checked_in: "Checked in",
  not_coming: "Not coming",
};

const guestStatusBadgeClassNames: Record<GuestStatusValue, string> = {
  booked: "bg-gray-100 text-gray-700",
  arrived: "bg-green-100 text-green-800",
  checked_in: "bg-blue-100 text-blue-800",
  not_coming: "bg-red-100 text-red-800",
};

export type LatestGuestStatus = {
  guestId: number;
  status: GuestStatusValue;
  room: string | null;
  changedAt: string;
};

export type GuestStatusHistoryPart = {
  type: "text" | "user" | "guest" | "room";
  text: string;
};

// Выбирает последний статус каждого гостя независимо от порядка входного массива.
export function getLatestGuestStatuses(statuses: GuestStatus[]): Map<number, LatestGuestStatus> {
  const latestByGuest = new Map<number, GuestStatus>();

  statuses.forEach(status => {
    const current = latestByGuest.get(status.guest_id);

    if (!current) {
      latestByGuest.set(status.guest_id, status);
      return;
    }

    const timeDifference = Date.parse(status.changed_at) - Date.parse(current.changed_at);

    if (timeDifference > 0 || (timeDifference === 0 && status.id > current.id)) {
      latestByGuest.set(status.guest_id, status);
    }
  });

  return new Map(
    [...latestByGuest.entries()].map(([guestId, status]) => [
      guestId,
      {
        guestId,
        status: status.status as GuestStatusValue,
        room: status.room,
        changedAt: status.changed_at,
      },
    ])
  );
}

//  Ищет предыдущий статус гостя для формирования истории изменений.
export function getPreviousGuestStatuses(statuses: GuestStatus[]): Map<number, GuestStatus> {
  const previousStatuses = new Map<number, GuestStatus>();
  const latestByGuest = new Map<number, GuestStatus>();
  const chronologicalStatuses = [...statuses].sort((left, right) => {
    const timeDifference = Date.parse(left.changed_at) - Date.parse(right.changed_at);

    return timeDifference || left.id - right.id;
  });

  chronologicalStatuses.forEach(status => {
    const previousStatus = latestByGuest.get(status.guest_id);

    if (previousStatus) {
      previousStatuses.set(status.id, previousStatus);
    }

    latestByGuest.set(status.guest_id, status);
  });

  return previousStatuses;
}

// Создает человеческое представление статуса для вывода на экран
export function getGuestStatusHistoryMessage(
  status: GuestStatus,
  previousStatus: GuestStatus | undefined,
  guestName: string,
  userName: string
): GuestStatusHistoryPart[] {
  const user = { type: "user", text: userName } satisfies GuestStatusHistoryPart;
  const guest = { type: "guest", text: guestName } satisfies GuestStatusHistoryPart;
  const text = (value: string): GuestStatusHistoryPart => ({ type: "text", text: value });
  const room = (value: string): GuestStatusHistoryPart => ({ type: "room", text: value });

  if (status.status === "arrived" && previousStatus?.status === "checked_in") {
    return [user, text(" cancelled check-in for "), guest];
  }

  if (status.status === "booked" && previousStatus?.status === "arrived") {
    return [user, text(" cancelled arrival for "), guest];
  }

  if (previousStatus && status.room && status.room !== previousStatus.room) {
    return [
      user,
      text(" moved "),
      guest,
      text(" from "),
      room(previousStatus.room ?? "unassigned"),
      text(" to "),
      room(status.room),
    ];
  }

  if (status.status === "booked") {
    if (status.room && !previousStatus) {
      return [user, text(" assigned room "), room(status.room), text(" to "), guest];
    }

    return [user, text(" confirmed the booking for "), guest];
  }

  if (status.status === "checked_in") {
    const roomDescription = status.room
      ? [text(" to room "), room(status.room)]
      : [];

    return [user, text(" checked in "), guest, ...roomDescription];
  }

  if (status.status === "arrived") {
    const roomDescription = status.room
      ? [text(" in room "), room(status.room)]
      : [];

    return [user, text(" registered the arrival of "), guest, ...roomDescription];
  }

  if (status.status === "not_coming") {
    return [user, text(" marked "), guest, text(" as not coming")];
  }

  return [user, text(" updated the status for "), guest, text(` to ${status.status}`)];
}

const guestStatusesService = {
  // Возвращает единое отображаемое название статуса для всех компонентов.
  getStatusLabel: (status: GuestStatusValue): string => {
    return guestStatusLabels[status];
  },

  // Возвращает единый CSS-класс badge для каждого возможного статуса гостя.
  getStatusBadgeClassName: (status: GuestStatusValue): string => {
    return guestStatusBadgeClassNames[status];
  },

  getGuestStatusesByRetreatId: async (retreatId: number): Promise<GuestStatus[]> => {
    return db.guestStatuses.getByRetreatId(retreatId);
  },

  // Загружает статусы ретрита и выбирает последний статус каждого гостя.
  getLatestForRetreat: async (retreatId: number): Promise<Map<number, LatestGuestStatus>> => {
    const statuses = await db.guestStatuses.getByRetreatId(retreatId);
    return getLatestGuestStatuses(statuses);
  },

  createStatus: async (
    retreatId: number,
    guestId: number,
    status: GuestStatusValue,
    room: string | null,
    updatedBy: number
  ): Promise<GuestStatus> => {
    return db.guestStatuses.create({
      retreat_id: retreatId,
      guest_id: guestId,
      status,
      room,
      updated_by: updatedBy,
    });
  },
};

export default guestStatusesService;