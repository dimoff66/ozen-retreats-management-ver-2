import db from "./database";
import type { CreateTaxiGuest, CreateTaxiRide, CreateTaxiRideBatch, TaxiGuest, TaxiRide } from "./database";

const taxiRidesService = {
  getByRetreatId: (retreatId: number): Promise<TaxiRide[]> => {
    return db.taxiRides.getByRetreatId(retreatId);
  },

  getGuestsByRideId: (rideId: number): Promise<TaxiGuest[]> => {
    return db.taxiGuests.getByRideId(rideId);
  },

  getGuestsByRideIds: (rideIds: number[]): Promise<TaxiGuest[]> => {
    return db.taxiGuests.getByRideIds(rideIds);
  },

  createRides: (retreatId: number, rides: CreateTaxiRideBatch[]): Promise<TaxiRide[]> => {
    return db.taxiRides.createRides(retreatId, rides);
  },

  create: (ride: CreateTaxiRide): Promise<TaxiRide> => {
    return db.taxiRides.create(ride);
  },

  update: (id: number, changes: Partial<CreateTaxiRide>): Promise<TaxiRide> => {
    return db.taxiRides.update(id, changes);
  },

  delete: (id: number): Promise<void> => {
    return db.taxiRides.delete(id);
  },

  addGuest: (guest: CreateTaxiGuest): Promise<TaxiGuest> => {
    return db.taxiGuests.create(guest);
  },

  deleteGuest: (id: number): Promise<void> => {
    return db.taxiGuests.delete(id);
  },

  moveGuest: (id: number, rideId: number): Promise<TaxiGuest> => {
    return db.taxiGuests.update(id, { ride_id: rideId });
  },
};

export default taxiRidesService;
