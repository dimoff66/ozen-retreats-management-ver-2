import guestStatusesService from "@/services/guestStatusesService";
import type { GuestStatusValue } from "@/services/guestStatusesService";
import { assertTest, runServiceTest } from "./types";
import type { ServiceTestResult } from "./types";

export type CreateStatusTestInput = {
  retreatId: number;
  guestId: number;
  status: GuestStatusValue;
  roomId: number | null;
  expectedRoom: string | null;
  updatedBy: number;
};

export async function testCreateGuestStatus(
  input: CreateStatusTestInput
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const created = await guestStatusesService.createStatus(
      input.retreatId,
      input.guestId,
      input.status,
      input.roomId,
      input.updatedBy
    );
    const latest = await guestStatusesService.getLatestForRetreat(input.retreatId);
    const latestForGuest = latest.get(input.guestId);

    assertTest(created.guest_id === input.guestId, "Created status has the wrong guest_id.");
    assertTest(created.status === input.status, "Created status value does not match.");
    assertTest(created.room === input.expectedRoom, "Created status room does not match.");
    assertTest(latestForGuest?.status === input.status, "Latest guest status was not updated.");
    assertTest(latestForGuest?.room === input.expectedRoom, "Latest guest status room does not match.");
  });
}

export async function testGuestStatusSequence(
  retreatId: number,
  guestId: number,
  roomId: number | null,
  updatedBy: number,
  statuses: GuestStatusValue[]
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    for (const status of statuses) {
      await guestStatusesService.createStatus(retreatId, guestId, status, roomId, updatedBy);
    }

    const latest = await guestStatusesService.getLatestForRetreat(retreatId);
    const expected = statuses.at(-1);

    assertTest(Boolean(expected), "Status sequence is empty.");
    assertTest(latest.get(guestId)?.status === expected, "Latest status does not match the last created status.");
  });
}
