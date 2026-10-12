import guestStatusesService from "./guestStatusesService";
import type { GuestStatusAction, GuestStatusValue } from "./guestStatusesService";

export type GuestAction =
  | "move_room"
  | "swap_room"
  | GuestStatusAction;

// Определяет допустимые действия с гостем по роли, текущему статусу и наличию комнаты.
export function getAvailableGuestActions(
  role: string,
  status: GuestStatusValue,
  hasRoom: boolean
): GuestAction[] {
  const actions: GuestAction[] = [];
  const canManageRooms = role === "admin" || role === "organizer";
  const canManageStatus = role === "admin" || role === "manager";

  if (canManageRooms && status !== "not_coming") {
    actions.push("move_room");

    if (hasRoom) {
      actions.push("swap_room");
    }
  }

  if (canManageStatus) {
    actions.push(...guestStatusesService.getAvailableStatusActions(status));
  }

  return actions;
}
