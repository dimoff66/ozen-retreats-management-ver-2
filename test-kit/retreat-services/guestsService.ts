import guestsService from "@/services/guestsService";
import guestStatusesService from "@/services/guestStatusesService";
import type { CreateGuest, UpdateGuest } from "@/services/database";
import { assertTest, runServiceTest } from "./types";
import type { ServiceTestResult } from "./types";

export type GuestWriteTestInput = {
  guest: CreateGuest;
  expectedRoomLabel?: string;
};

export async function testCreateGuest(input: GuestWriteTestInput): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const created = await guestsService.createGuest(input.guest);
    const [loaded, retreatGuests] = await Promise.all([
      guestsService.getGuestById(created.id),
      guestsService.getGuestsByRetreatId(input.guest.retreat_id),
    ]);

    assertTest(loaded !== null, "Created guest cannot be loaded.");
    assertTest(retreatGuests.some((guest) => guest.id === created.id), "Created guest is missing from retreat guests.");
    assertTest(loaded.name === input.guest.name.trim(), "Created guest name does not match.");
    assertTest(loaded.room_id === (input.guest.room_id ?? null), "Created guest room does not match.");

    if (input.guest.room_id) {
      const [latest, roomGuests] = await Promise.all([
        guestStatusesService.getLatestForRetreat(input.guest.retreat_id),
        guestsService.getGuestsByRoomId(input.guest.room_id),
      ]);

      assertTest(roomGuests.some((guest) => guest.id === created.id), "Created guest is missing from assigned room.");
      const status = latest.get(created.id);

      assertTest(status?.status === "booked", "Creating a guest with a room did not create booked status.");

      if (input.expectedRoomLabel !== undefined) {
        assertTest(status?.room === input.expectedRoomLabel, "Booked status room label does not match.");
      }
    }
  });
}

export type UpdateGuestTestInput = {
  guestId: number;
  changes: UpdateGuest;
  retreatId: number;
  expectedRoomLabel?: string;
};

export async function testUpdateGuest(input: UpdateGuestTestInput): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const before = await guestsService.getGuestById(input.guestId);
    assertTest(before !== null, "Guest does not exist before update test.");

    const updated = await guestsService.updateGuest(input.guestId, input.changes);
    const loaded = await guestsService.getGuestById(input.guestId);

    assertTest(loaded !== null, "Updated guest cannot be loaded.");

    Object.entries(input.changes).forEach(([key, value]) => {
      if (value !== undefined) {
        const actual = updated[key as keyof typeof updated];
        assertTest(actual === value, `Updated guest field ${key} does not match.`);
      }
    });

    if (input.changes.room_id && input.changes.room_id !== before.room_id) {
      const latest = await guestStatusesService.getLatestForRetreat(input.retreatId);
      const status = latest.get(input.guestId);

      assertTest(status?.status === "booked", "Changing room did not create booked status.");

      if (input.expectedRoomLabel !== undefined) {
        assertTest(status?.room === input.expectedRoomLabel, "Room-change status label does not match.");
      }
    }
  });
}

export type SwapRoomsTestInput = {
  firstGuestId: number;
  secondGuestId: number;
  retreatId: number;
  expectedFirstRoomLabel?: string;
  expectedSecondRoomLabel?: string;
};

export async function testSwapGuestRooms(input: SwapRoomsTestInput): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const [beforeFirst, beforeSecond] = await Promise.all([
      guestsService.getGuestById(input.firstGuestId),
      guestsService.getGuestById(input.secondGuestId),
    ]);

    assertTest(beforeFirst !== null && beforeSecond !== null, "Both guests must exist before swap test.");
    assertTest(beforeFirst.room_id !== null && beforeSecond.room_id !== null, "Both guests need rooms before swap test.");

    await guestsService.swapRooms(input.firstGuestId, input.secondGuestId);

    const [afterFirst, afterSecond, latest] = await Promise.all([
      guestsService.getGuestById(input.firstGuestId),
      guestsService.getGuestById(input.secondGuestId),
      guestStatusesService.getLatestForRetreat(input.retreatId),
    ]);

    assertTest(afterFirst?.room_id === beforeSecond.room_id, "First guest did not receive second guest room.");
    assertTest(afterSecond?.room_id === beforeFirst.room_id, "Second guest did not receive first guest room.");
    assertTest(latest.get(input.firstGuestId)?.status === "booked", "First guest swap status is not booked.");
    assertTest(latest.get(input.secondGuestId)?.status === "booked", "Second guest swap status is not booked.");

    if (input.expectedFirstRoomLabel !== undefined) {
      assertTest(
        latest.get(input.firstGuestId)?.room === input.expectedFirstRoomLabel,
        "First guest swap room label does not match."
      );
    }

    if (input.expectedSecondRoomLabel !== undefined) {
      assertTest(
        latest.get(input.secondGuestId)?.room === input.expectedSecondRoomLabel,
        "Second guest swap room label does not match."
      );
    }
  });
}

export async function testDeleteGuest(guestId: number): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    await guestsService.deleteGuest(guestId);
    const loaded = await guestsService.getGuestById(guestId);

    assertTest(loaded === null, "Deleted guest still exists.");
  });
}

export async function testCreateGuestWithoutBookedStatus(
  guest: CreateGuest
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const created = await guestsService.createGuest({ ...guest, room_id: null });
    const statuses = await guestStatusesService.getGuestStatusesByRetreatId(guest.retreat_id);

    assertTest(
      !statuses.some((status) => status.guest_id === created.id),
      "Creating a guest without a room created an unexpected status."
    );
  });
}

export async function testUpdateGuestWithoutStatus(
  guestId: number,
  retreatId: number,
  changes: UpdateGuest
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const beforeStatuses = await guestStatusesService.getGuestStatusesByRetreatId(retreatId);
    const beforeCount = beforeStatuses.filter((status) => status.guest_id === guestId).length;

    await guestsService.updateGuest(guestId, changes);

    const afterStatuses = await guestStatusesService.getGuestStatusesByRetreatId(retreatId);
    const afterCount = afterStatuses.filter((status) => status.guest_id === guestId).length;

    assertTest(afterCount === beforeCount, "Updating non-room guest data created an unexpected status.");
  });
}

export async function testRejectEmptyGuestName(retreatId: number): Promise<ServiceTestResult> {
  try {
    await guestsService.createGuest({ retreat_id: retreatId, name: "   " });
    return "Guest with an empty name was created instead of being rejected.";
  } catch {
    return true;
  }
}
