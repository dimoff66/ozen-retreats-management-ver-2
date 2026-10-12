import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  testCreateGuestStatus,
  testGuestStatusSequence,
} from "../../test-kit/retreat-services/guestStatusesService";
import { getLatestGuestStatuses } from "@/services/guestStatusesService";
import type { GuestStatus } from "@/services/database";
import { expectServiceTest } from "../helpers/serviceTest";
import {
  cleanupMutableRetreatData,
  cleanupServiceTestContext,
  createServiceTestContext,
  createTestGuest,
} from "../helpers/testContext";
import type { ServiceTestContext } from "../helpers/testContext";

let context: ServiceTestContext;

beforeAll(async () => {
  context = await createServiceTestContext();
});

afterEach(async () => {
  await cleanupMutableRetreatData(context.retreat.id);
});

afterAll(async () => {
  await cleanupServiceTestContext(context);
});

describe("guestStatusesService", () => {
  // Latest выбирается по времени/id, а не по порядку записей в переданном массиве.
  it("finds latest statuses regardless of input order", () => {
    const statuses = [
      { id: 12, retreat_id: 1, guest_id: 7, status: "checked_in", room: "Cube A1", updated_by: 1, changed_at: "2026-10-12T12:00:00.000Z" },
      { id: 10, retreat_id: 1, guest_id: 7, status: "booked", room: "Cube A1", updated_by: 1, changed_at: "2026-10-12T10:00:00.000Z" },
      { id: 11, retreat_id: 1, guest_id: 7, status: "arrived", room: "Cube A1", updated_by: 1, changed_at: "2026-10-12T12:00:00.000Z" },
    ] satisfies GuestStatus[];

    const latest = getLatestGuestStatuses([statuses[1], statuses[0], statuses[2]]);

    expect(latest.get(7)?.status).toBe("checked_in");
    expect(latest.get(7)?.changedAt).toBe("2026-10-12T12:00:00.000Z");
  });

  // Проверяем создание отдельной записи статуса и немедленное получение её как latest для конкретного гостя.
  it("creates a status and returns it as latest", async () => {
    const guest = await createTestGuest(context, "status create", context.rooms.cubeA1.id);
    const result = await testCreateGuestStatus({
      retreatId: context.retreat.id,
      guestId: guest.id,
      status: "arrived",
      room: context.roomLabels.cubeA1,
      updatedBy: context.adminUserId,
    });

    expectServiceTest(result);
  });

  // Проверяем последовательность booked → arrived → checked_in: latest должен указывать на последний созданный статус.
  it("returns the last status in a status sequence", async () => {
    const guest = await createTestGuest(context, "status sequence");
    const result = await testGuestStatusSequence(
      context.retreat.id,
      guest.id,
      context.roomLabels.cubeA1,
      context.adminUserId,
      ["booked", "arrived", "checked_in"]
    );

    expectServiceTest(result);
  });
});
