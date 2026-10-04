import type { GuestStatusValue } from "./guestStatusesService";

export type GuestAction =
  | "move_room"
  | "swap_room"
  | "mark_arrived"
  | "not_coming"
  | "check_in"
  | "cancel_check_in"
  | "cancel_arrival";

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
    actions.push("mark_arrived", "not_coming");
  } else if (status === "arrived") {
    actions.push("check_in", "cancel_arrival");
  } else if (status === "checked_in") {
    actions.push("cancel_check_in");
  }

  return actions;
}
