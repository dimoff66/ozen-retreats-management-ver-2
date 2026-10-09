import taxiRidesService from "@/services/taxiRidesService";
import type { CreateTaxiGuest, CreateTaxiRide, UpdateTaxiRide } from "@/services/database";
import { assertTest, runServiceTest } from "./types";
import type { ServiceTestResult } from "./types";

export async function testCreateTaxiRide(ride: CreateTaxiRide): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const created = await taxiRidesService.create(ride);
    const rides = await taxiRidesService.getByRetreatId(ride.retreat_id);

    assertTest(rides.some((item) => item.id === created.id), "Created taxi ride is missing from retreat rides.");
    assertTest(created.arrival_datetime === ride.arrival_datetime, "Taxi ride arrival time does not match.");
  });
}

export async function testUpdateTaxiRide(
  rideId: number,
  changes: UpdateTaxiRide,
  retreatId: number
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const updated = await taxiRidesService.update(rideId, changes);
    const rides = await taxiRidesService.getByRetreatId(retreatId);
    const loaded = rides.find((item) => item.id === rideId);

    assertTest(Boolean(loaded), "Updated taxi ride cannot be loaded.");

    Object.entries(changes).forEach(([key, value]) => {
      if (value !== undefined) {
        const actual = updated[key as keyof typeof updated];
        assertTest(actual === value, `Updated taxi ride field ${key} does not match.`);
      }
    });
  });
}

export async function testAddTaxiGuest(guest: CreateTaxiGuest): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const created = await taxiRidesService.addGuest(guest);
    const guests = await taxiRidesService.getGuestsByRideId(guest.ride_id);

    assertTest(guests.some((item) => item.id === created.id), "Taxi guest was not added to the ride.");
  });
}

export async function testMoveTaxiGuest(
  taxiGuestId: number,
  targetRideId: number
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const moved = await taxiRidesService.moveGuest(taxiGuestId, targetRideId);
    const guests = await taxiRidesService.getGuestsByRideId(targetRideId);

    assertTest(moved.ride_id === targetRideId, "Moved taxi guest has the wrong ride_id.");
    assertTest(guests.some((item) => item.id === taxiGuestId), "Moved taxi guest is missing from target ride.");
  });
}

export async function testDeleteTaxiGuest(
  taxiGuestId: number,
  rideId: number
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    await taxiRidesService.deleteGuest(taxiGuestId);
    const guests = await taxiRidesService.getGuestsByRideId(rideId);

    assertTest(!guests.some((item) => item.id === taxiGuestId), "Deleted taxi guest still exists in ride.");
  });
}

export async function testDeleteTaxiRide(
  rideId: number,
  retreatId: number
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    await taxiRidesService.delete(rideId);
    const rides = await taxiRidesService.getByRetreatId(retreatId);

    assertTest(!rides.some((item) => item.id === rideId), "Deleted taxi ride still exists.");
  });
}
