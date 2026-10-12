import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import guestsService from "@/services/guestsService";
import {
  testCreateGuest,
  testCreateGuestWithoutBookedStatus,
  testDeleteGuest,
  testRejectEmptyGuestName,
  testSwapGuestRooms,
  testUpdateGuest,
  testUpdateGuestWithoutStatus,
} from "../../test-kit/retreat-services/guestsService";
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

describe("guestsService", () => {
  it("keeps guest record permissions in the service", () => {
    expect(guestsService.canManageGuestRecords("admin")).toBe(true);
    expect(guestsService.canManageGuestRecords("organizer")).toBe(true);
    expect(guestsService.canManageGuestRecords("manager")).toBe(false);
    expect(guestsService.canManageGuestRecords("taxi")).toBe(false);
  });

  it("validates room-swap candidates", () => {
    const firstGuest = {
      id: 1,
      retreat_id: 1,
      name: "First",
      is_organizer: false,
      arrival_date: null,
      diet_notes: null,
      room_id: 10,
      created_at: "",
    };
    const secondGuest = { ...firstGuest, id: 2, name: "Second", room_id: 11 };

    expect(guestsService.canSwapGuests(firstGuest, secondGuest, "booked", "arrived")).toBe(true);
    expect(guestsService.canSwapGuests(firstGuest, secondGuest, "booked", "not_coming")).toBe(false);
    expect(guestsService.canSwapGuests(firstGuest, firstGuest, "booked", "booked")).toBe(false);
  });

  // Проверяем, что гость без комнаты создаётся без автоматической записи booked в истории статусов.
  it("creates a guest without a booked status when room is not assigned", async () => {
    const result = await testCreateGuestWithoutBookedStatus({
      retreat_id: context.retreat.id,
      name: `__TEST__ ${context.runId} no room`,
    }, context.adminUserId);

    expectServiceTest(result);
  });

  // Проверяем атомарное создание гостя с комнатой и автоматической записью booked с правильным названием комнаты.
  it("creates a guest with room and booked status", async () => {
    const result = await testCreateGuest({
      guest: {
        retreat_id: context.retreat.id,
        name: `  __TEST__ ${context.runId} booked  `,
        room_id: context.rooms.cubeA1.id,
      },
      updatedBy: context.adminUserId,
      expectedRoomLabel: context.roomLabels.cubeA1,
    });

    expectServiceTest(result);
  });

  // Проверяем, что изменение обычных полей гостя не создаёт лишнюю запись booked.
  it("updates non-room guest fields without creating a status", async () => {
    const guest = await createTestGuest(context, "normal update", context.rooms.cubeA1.id);
    const result = await testUpdateGuestWithoutStatus(
      guest.id,
      context.retreat.id,
      { diet_notes: "Vegan test note" },
      context.adminUserId
    );

    expectServiceTest(result);
  });

  // Проверяем смену комнаты: guest.room_id должен измениться, а новая запись booked должна содержать новую комнату.
  it("changes room and creates a new booked status", async () => {
    const guest = await createTestGuest(context, "room change", context.rooms.cubeA1.id);
    const result = await testUpdateGuest({
      guestId: guest.id,
      retreatId: context.retreat.id,
      changes: { room_id: context.rooms.cubeA2.id },
      updatedBy: context.adminUserId,
      expectedRoomLabel: context.roomLabels.cubeA2,
    });

    expectServiceTest(result);
  });

  // Проверяем атомарный обмен комнатами двух гостей и создание booked для обоих участников обмена.
  it("swaps rooms and records booked statuses for both guests", async () => {
    const firstGuest = await createTestGuest(context, "swap A", context.rooms.cubeA2.id);
    const secondGuest = await createTestGuest(context, "swap B", context.rooms.cubeB1.id);
    const result = await testSwapGuestRooms({
      firstGuestId: firstGuest.id,
      secondGuestId: secondGuest.id,
      retreatId: context.retreat.id,
      updatedBy: context.adminUserId,
      expectedFirstRoomLabel: context.roomLabels.cubeB1,
      expectedSecondRoomLabel: context.roomLabels.cubeA2,
    });

    expectServiceTest(result);
  });

  // Проверяем бизнес-валидацию имени: строка из пробелов не должна приводить к созданию гостя.
  it("rejects an empty guest name", async () => {
    const result = await testRejectEmptyGuestName(context.retreat.id, context.adminUserId);

    expectServiceTest(result);
  });

  // Проверяем удаление гостя через сервис и отсутствие записи при повторном чтении.
  it("deletes a guest", async () => {
    const guest = await guestsService.createGuest({
      retreat_id: context.retreat.id,
      name: `__TEST__ ${context.runId} delete`,
    }, context.adminUserId);
    const result = await testDeleteGuest(guest.id);

    expectServiceTest(result);
  });
});
