import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import guestStatusesService from "@/services/guestStatusesService";
import {
  testRejectOccupiedRoomDisable,
  testRoomSelectableState,
  testSaveRetreatRooms,
} from "../../test-kit/retreat-services/retreatRoomsService";
import { expectServiceTest } from "../helpers/serviceTest";
import {
  cleanupMutableRetreatData,
  cleanupServiceTestContext,
  createServiceTestContext,
  createTestGuest,
  restoreTestRetreatRooms,
} from "../helpers/testContext";
import type { ServiceTestContext } from "../helpers/testContext";

let context: ServiceTestContext;

beforeAll(async () => {
  context = await createServiceTestContext();
});

afterEach(async () => {
  await cleanupMutableRetreatData(context.retreat.id);
  await restoreTestRetreatRooms(context);
});

afterAll(async () => {
  await cleanupServiceTestContext(context);
});

describe("retreatRoomsService", () => {
  // Проверяем сохранение доступности комнат и max_guests только для временного test-retreat.
  it("saves retreat room availability and capacity", async () => {
    const result = await testSaveRetreatRooms(context.retreat.id, [
      { roomId: context.rooms.cubeA1.id, isAvailable: true, maxGuests: 2 },
      { roomId: context.rooms.cubeA2.id, isAvailable: true, maxGuests: 3 },
      { roomId: context.rooms.cone1.id, isAvailable: false, maxGuests: 1 },
    ]);

    expectServiceTest(result);
  });

  // Проверяем защиту занятой комнаты: сервис не должен разрешать убрать её из доступных комнат retreat.
  it("rejects disabling an occupied room", async () => {
    await createTestGuest(context, "occupied room", context.rooms.cubeA2.id);
    const result = await testRejectOccupiedRoomDisable(
      context.retreat.id,
      context.rooms.cubeA2.id,
      1
    );

    expectServiceTest(result);
  });

  // Проверяем capacity=2: пустая комната и комната 1/2 доступны, а при 2/2 больше не предлагаются для заселения.
  it("uses retreat room capacity when selecting rooms", async () => {
    expectServiceTest(await testRoomSelectableState(
      context.retreat.id,
      context.rooms.cubeA1.id,
      null,
      true
    ));

    await createTestGuest(context, "capacity first", context.rooms.cubeA1.id);
    expectServiceTest(await testRoomSelectableState(
      context.retreat.id,
      context.rooms.cubeA1.id,
      null,
      true
    ));

    await createTestGuest(context, "capacity second", context.rooms.cubeA1.id);
    expectServiceTest(await testRoomSelectableState(
      context.retreat.id,
      context.rooms.cubeA1.id,
      null,
      false
    ));
  });

  // Проверяем, что гость со статусом not_coming не занимает место и снова делает комнату 1/2 доступной.
  it("does not count not_coming guests as room occupants", async () => {
    await createTestGuest(context, "active occupant", context.rooms.cubeA1.id);
    const notComingGuest = await createTestGuest(context, "not coming occupant", context.rooms.cubeA1.id);

    await guestStatusesService.createStatus(
      context.retreat.id,
      notComingGuest.id,
      "not_coming",
      context.roomLabels.cubeA1,
      context.adminUserId
    );

    const result = await testRoomSelectableState(
      context.retreat.id,
      context.rooms.cubeA1.id,
      null,
      true
    );

    expectServiceTest(result);
  });
});
