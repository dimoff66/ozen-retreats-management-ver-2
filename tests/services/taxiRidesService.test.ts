import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import taxiRidesService from "@/services/taxiRidesService";
import {
  testAddTaxiGuest,
  testCreateTaxiRide,
  testCreateTaxiRidesBatch,
  testDeleteTaxiGuest,
  testDeleteTaxiRide,
  testMoveTaxiGuest,
  testUpdateTaxiRide,
} from "../../test-kit/retreat-services/taxiRidesService";
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

describe("taxiRidesService", () => {
  // Проверяем обычное создание Taxi ride и получение созданной поездки среди поездок test-retreat.
  it("creates a taxi ride", async () => {
    const result = await testCreateTaxiRide({
      retreat_id: context.retreat.id,
      arrival_datetime: "2099-01-10T10:00:00.000Z",
      driver_name: "Test Driver",
    });

    expectServiceTest(result);
  });

  // Проверяем изменение времени и водителя существующей поездки через сервис.
  it("updates a taxi ride", async () => {
    const ride = await taxiRidesService.create({
      retreat_id: context.retreat.id,
      arrival_datetime: "2099-01-10T10:00:00.000Z",
      driver_name: null,
    });
    const result = await testUpdateTaxiRide(
      ride.id,
      { arrival_datetime: "2099-01-10T10:30:00.000Z", driver_name: "Updated Driver" },
      context.retreat.id
    );

    expectServiceTest(result);
  });

  // Проверяем добавление в Taxi существующего зарегистрированного гостя через guest_id.
  it("adds a registered guest to a taxi ride", async () => {
    const guest = await createTestGuest(context, "taxi registered");
    const ride = await taxiRidesService.create({
      retreat_id: context.retreat.id,
      arrival_datetime: "2099-01-10T11:00:00.000Z",
      driver_name: null,
    });
    const result = await testAddTaxiGuest({ ride_id: ride.id, guest_id: guest.id });

    expectServiceTest(result);
  });

  // Проверяем добавление пассажира, которого нет среди guests, через unbooked_guest_name.
  it("adds an unbooked passenger to a taxi ride", async () => {
    const ride = await taxiRidesService.create({
      retreat_id: context.retreat.id,
      arrival_datetime: "2099-01-10T11:30:00.000Z",
      driver_name: null,
    });
    const result = await testAddTaxiGuest({
      ride_id: ride.id,
      guest_id: null,
      unbooked_guest_name: "__TEST__ External Passenger",
    });

    expectServiceTest(result);
  });

  // Проверяем перенос пассажира из одной поездки в другую без создания новой записи пассажира.
  it("moves a taxi passenger between rides", async () => {
    const firstRide = await taxiRidesService.create({
      retreat_id: context.retreat.id,
      arrival_datetime: "2099-01-10T12:00:00.000Z",
    });
    const secondRide = await taxiRidesService.create({
      retreat_id: context.retreat.id,
      arrival_datetime: "2099-01-10T12:30:00.000Z",
    });
    const taxiGuest = await taxiRidesService.addGuest({
      ride_id: firstRide.id,
      unbooked_guest_name: "__TEST__ Moving Passenger",
    });
    const result = await testMoveTaxiGuest(taxiGuest.id, secondRide.id);

    expectServiceTest(result);
  });

  // Проверяем удаление отдельного пассажира из поездки.
  it("deletes a taxi passenger", async () => {
    const ride = await taxiRidesService.create({
      retreat_id: context.retreat.id,
      arrival_datetime: "2099-01-10T13:00:00.000Z",
    });
    const taxiGuest = await taxiRidesService.addGuest({
      ride_id: ride.id,
      unbooked_guest_name: "__TEST__ Delete Passenger",
    });
    const result = await testDeleteTaxiGuest(taxiGuest.id, ride.id);

    expectServiceTest(result);
  });

  // Проверяем удаление самой поездки через сервис.
  it("deletes a taxi ride", async () => {
    const ride = await taxiRidesService.create({
      retreat_id: context.retreat.id,
      arrival_datetime: "2099-01-10T13:30:00.000Z",
    });
    const result = await testDeleteTaxiRide(ride.id, context.retreat.id);

    expectServiceTest(result);
  });

  // Проверяем массовый import/save: старые поездки заменяются целиком, новые rides и пассажиры создаются одним сервисным вызовом.
  it("replaces all retreat taxi rides with a batch", async () => {
    const registeredGuest = await createTestGuest(context, "taxi batch registered");
    const result = await testCreateTaxiRidesBatch(context.retreat.id, [
      {
        arrival_datetime: "2099-01-10T14:00:00.000Z",
        driver_name: "Batch Driver 1",
        guests: [
          { guest_id: registeredGuest.id, unbooked_guest_name: null },
          { guest_id: null, unbooked_guest_name: "__TEST__ Batch External" },
        ],
      },
      {
        arrival_datetime: "2099-01-10T15:00:00.000Z",
        driver_name: null,
        guests: [],
      },
    ]);

    expectServiceTest(result);
  });
});
