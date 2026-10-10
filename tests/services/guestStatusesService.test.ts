import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import {
  testCreateGuestStatus,
  testGuestStatusSequence,
} from "../../test-kit/retreat-services/guestStatusesService";
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
