import type {
  Guest,
  GuestStatus,
  House,
  HouseMap,
  Retreat,
  RetreatRoom,
  Room,
  TaxiGuest,
  TaxiRide,
} from "./database";
import guestStatusesService from "./guestStatusesService";
import guestsService from "./guestsService";
import houseMapsService from "./houseMapsService";
import housesService from "./housesService";
import retreatRoomsService from "./retreatRoomsService";
import retreatsService from "./retreatsService";
import roomsService from "./roomsService";
import taxiRidesService from "./taxiRidesService";
import type { LatestGuestStatus } from "./guestStatusesService";

export type RetreatSnapshot = {
  retreat: Retreat;
  guests: Guest[];
  statuses: GuestStatus[];
  latestStatuses: Map<number, LatestGuestStatus>;
  taxiRides: TaxiRide[];
  taxiGuests: TaxiGuest[];
  retreatRooms: RetreatRoom[];
  houses: House[];
  rooms: Room[];
  houseMaps: HouseMap[];
};

const retreatSnapshotService = {
  getSnapshot: async (retreatId: number): Promise<RetreatSnapshot> => {
    const retreat = await retreatsService.getRetreatById(retreatId);

    if (!retreat) {
      throw new Error("Retreat no longer exists.");
    }

    const [
      guests,
      statuses,
      latestStatuses,
      taxiRides,
      retreatRooms,
      houses,
      rooms,
      houseMaps,
    ] = await Promise.all([
      guestsService.getGuestsByRetreatId(retreatId),
      guestStatusesService.getGuestStatusesByRetreatId(retreatId),
      guestStatusesService.getLatestForRetreat(retreatId),
      taxiRidesService.getByRetreatId(retreatId),
      retreatRoomsService.getRetreatRooms(retreatId),
      housesService.getHouses(),
      roomsService.getRooms(),
      houseMapsService.getHouseMaps(),
    ]);

    const taxiGuests = await taxiRidesService.getGuestsByRideIds(
      taxiRides.map((ride) => ride.id)
    );
    const sortedHouseMaps = [...houseMaps].sort(
      (left, right) => left.house_id - right.house_id || left.id - right.id
    );

    return {
      retreat,
      guests,
      statuses,
      latestStatuses,
      taxiRides,
      taxiGuests,
      retreatRooms,
      houses,
      rooms,
      houseMaps: sortedHouseMaps,
    };
  },
};

export default retreatSnapshotService;
