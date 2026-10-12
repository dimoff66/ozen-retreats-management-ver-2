import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  testCreateGuestStatus,
  testGuestStatusSequence,
} from "../../test-kit/retreat-services/guestStatusesService";
import guestStatusesService, { getLatestGuestStatuses } from "@/services/guestStatusesService";
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
  it("returns shared status labels", () => {
    expect(guestStatusesService.getStatusLabel("booked")).toBe("Booked");
    expect(guestStatusesService.getStatusLabel("arrived")).toBe("Arrived");
    expect(guestStatusesService.getStatusLabel("checked_in")).toBe("Checked in");
    expect(guestStatusesService.getStatusLabel("not_coming")).toBe("Not coming");
  });

  it("returns shared status badge classes", () => {
    expect(guestStatusesService.getStatusBadgeClassName("booked")).toBe("bg-gray-100 text-gray-700");
    expect(guestStatusesService.getStatusBadgeClassName("arrived")).toBe("bg-green-100 text-green-800");
    expect(guestStatusesService.getStatusBadgeClassName("checked_in")).toBe("bg-blue-100 text-blue-800");
    expect(guestStatusesService.getStatusBadgeClassName("not_coming")).toBe("bg-red-100 text-red-800");
  });

  it("returns shared status text classes", () => {
    expect(guestStatusesService.getStatusTextClassName("booked")).toBe("text-gray-700");
    expect(guestStatusesService.getStatusTextClassName("arrived")).toBe("text-blue-700");
    expect(guestStatusesService.getStatusTextClassName("checked_in")).toBe("text-green-700");
    expect(guestStatusesService.getStatusTextClassName("not_coming")).toBe("text-black line-through");
  });

  it("derives available actions and next statuses from current status", () => {
    expect(guestStatusesService.getAvailableStatusActions("booked")).toEqual(["mark_arrived", "not_coming"]);
    expect(guestStatusesService.getAvailableStatusActions("arrived")).toEqual(["check_in", "cancel_arrival"]);
    expect(guestStatusesService.getAvailableStatusActions("checked_in")).toEqual(["cancel_check_in"]);
    expect(guestStatusesService.getAvailableStatusActions("not_coming")).toEqual([]);

    expect(guestStatusesService.getNextStatus("booked", "mark_arrived")).toBe("arrived");
    expect(guestStatusesService.getNextStatus("arrived", "check_in")).toBe("checked_in");
    expect(guestStatusesService.getNextStatus("checked_in", "cancel_check_in")).toBe("arrived");
    expect(guestStatusesService.getNextStatus("arrived", "cancel_arrival")).toBe("booked");
    expect(guestStatusesService.getNextStatus("booked", "not_coming")).toBe("not_coming");
    expect(guestStatusesService.getNextStatus("booked", "check_in")).toBeNull();
  });

  it("rejects a status action that is not available from the current status", async () => {
    const guest = await createTestGuest(context, "invalid status action", context.rooms.cubeA1.id);

    await expect(guestStatusesService.applyStatusAction(
      context.retreat.id,
      guest.id,
      "booked",
      "check_in",
      guest.room_id,
      context.adminUserId
    )).rejects.toThrow("Action check_in is not available for status booked.");
  });

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
      roomId: context.rooms.cubeA1.id,
      expectedRoom: context.roomLabels.cubeA1,
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
      context.rooms.cubeA1.id,
      context.adminUserId,
      ["booked", "arrived", "checked_in"]
    );

    expectServiceTest(result);
  });
});
