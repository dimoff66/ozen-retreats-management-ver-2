import taxiRidesService from "@/services/taxiRidesService";
import type { CreateTaxiGuest, CreateTaxiRide, CreateTaxiRideBatch, UpdateTaxiRide } from "@/services/database";
import { assertTest, runServiceTest } from "./types";
import type { ServiceTestResult } from "./types";

const isSameDateTime = (left: string, right: string): boolean => {
  return Date.parse(left) === Date.parse(right);
};

export async function testCreateTaxiRide(ride: CreateTaxiRide): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const created = await taxiRidesService.create(ride);
    const rides = await taxiRidesService.getByRetreatId(ride.retreat_id);

    assertTest(rides.some((item) => item.id === created.id), "Created taxi ride is missing from retreat rides.");
    assertTest(isSameDateTime(created.arrival_datetime, ride.arrival_datetime), "Taxi ride arrival time does not match.");
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
      if (value === undefined) {
        return;
      }

      const actual = updated[key as keyof typeof updated];

      if (key === "arrival_datetime" && typeof actual === "string" && typeof value === "string") {
        assertTest(isSameDateTime(actual, value), `Updated taxi ride field ${key} does not match.`);
        return;
      }

      assertTest(actual === value, `Updated taxi ride field ${key} does not match.`);
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


export async function testCreateTaxiRidesBatch(
  retreatId: number,
  rides: CreateTaxiRideBatch[]
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const oldRide = await taxiRidesService.create({
      retreat_id: retreatId,
      arrival_datetime: "2099-01-10T07:00:00.000Z",
      driver_name: "Old test driver",
    });

    const created = await taxiRidesService.createRides(retreatId, rides);
    const loaded = await taxiRidesService.getByRetreatId(retreatId);
    const allTaxiGuests = await taxiRidesService.getGuestsByRideIds(loaded.map((ride) => ride.id));

    assertTest(!loaded.some((ride) => ride.id === oldRide.id), "Old taxi ride was not removed by batch replace.");
    assertTest(created.length === rides.length, "Batch create returned the wrong number of taxi rides.");
    assertTest(loaded.length === rides.length, "Retreat contains the wrong number of taxi rides after batch replace.");
    assertTest(
      allTaxiGuests.length === rides.reduce((sum, ride) => sum + ride.guests.length, 0),
      "getGuestsByRideIds returned the wrong passenger count after batch replace."
    );

    for (const rideInput of rides) {
      const ride = loaded.find((item) => isSameDateTime(item.arrival_datetime, rideInput.arrival_datetime));

      assertTest(Boolean(ride), `Taxi ride ${rideInput.arrival_datetime} was not created.`);

      if (!ride) {
        continue;
      }

      const guests = await taxiRidesService.getGuestsByRideId(ride.id);

      assertTest(guests.length === rideInput.guests.length, "Taxi ride passenger count does not match batch input.");

      rideInput.guests.forEach((guestInput) => {
        const matchingGuest = guests.find((guest) => (
          guest.guest_id === guestInput.guest_id
          && guest.unbooked_guest_name === guestInput.unbooked_guest_name
        ));

        assertTest(Boolean(matchingGuest), "Taxi ride passenger data does not match batch input.");
      });
    }
  });
}
