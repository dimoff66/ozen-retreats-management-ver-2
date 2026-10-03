import type { GuestStatusValue } from "./guestStatusesService";

export type GuestAction =
  | "move_room"
  | "swap_room"
  | "check_in"
  | "not_coming"
  | "register"
  | "cancel_check_in"
  | "cancel_registration";

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

  if (!canManageStatus) {
    return actions;
  }

  if (status === "booked") {
    actions.push("check_in", "not_coming");
  } else if (status === "checked_in") {
    actions.push("register", "cancel_check_in");
  } else if (status === "registered") {
    actions.push("cancel_registration");
  }

  return actions;
}
