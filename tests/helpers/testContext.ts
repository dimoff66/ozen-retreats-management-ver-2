import guestStatusesService from "@/services/guestStatusesService";
import guestsService from "@/services/guestsService";
import housesService from "@/services/housesService";
import retreatRoomsService from "@/services/retreatRoomsService";
import retreatsService from "@/services/retreatsService";
import roomsService from "@/services/roomsService";
import taxiRidesService from "@/services/taxiRidesService";
import db from "@/services/database";
import type { House, Retreat, Room } from "@/services/database";

export type ServiceTestContext = {
  runId: string;
  retreat: Retreat;
  adminUserId: number;
  rooms: {
    cubeA1: Room;
    cubeA2: Room;
    cubeB1: Room;
    cone1: Room;
  };
  roomLabels: {
    cubeA1: string;
    cubeA2: string;
    cubeB1: string;
    cone1: string;
  };
};

export async function createServiceTestContext(): Promise<ServiceTestContext> {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [houses, rooms, users] = await Promise.all([
    housesService.getHouses(),
    roomsService.getRooms(),
    db.users.getAll(),
  ]);
  const admin = users.find(user => user.role === "admin");

  if (!admin) {
    throw new Error("Test setup: user with admin role was not found.");
  }

  const cubes = houses.find((house: House) => house.name.toLowerCase() === "cubes");
  const cones = houses.find((house: House) => house.name.toLowerCase() === "cones");

  if (!cubes || !cones) {
    throw new Error("Test setup: houses Cubes and Cones must exist.");
  }

  const cubeA1 = findRoom(rooms, cubes.id, "A1", "Cubes A1");
  const cubeA2 = findRoom(rooms, cubes.id, "A2", "Cubes A2");
  const cubeB1 = findRoom(rooms, cubes.id, "B1", "Cubes B1");
  const cone1 = findRoom(rooms, cones.id, "1", "Cones 1");
  const retreat = await retreatsService.createRetreat({
    title: `__TEST__ Services ${runId}`,
    start_date: "2099-01-10",
    end_date: "2099-01-20",
    is_active: false,
  });

  await configureTestRetreatRooms(retreat.id, { cubeA1, cubeA2, cubeB1, cone1 });

  return {
    runId,
    retreat,
    adminUserId: admin.id,
    rooms: { cubeA1, cubeA2, cubeB1, cone1 },
    roomLabels: {
      cubeA1: roomsService.getRoomDisplayName(cubeA1, cubes),
      cubeA2: roomsService.getRoomDisplayName(cubeA2, cubes),
      cubeB1: roomsService.getRoomDisplayName(cubeB1, cubes),
      cone1: roomsService.getRoomDisplayName(cone1, cones),
    },
  };
}

export async function cleanupMutableRetreatData(retreatId: number): Promise<void> {
  const rides = await taxiRidesService.getByRetreatId(retreatId);

  for (const ride of rides) {
    const taxiGuests = await taxiRidesService.getGuestsByRideId(ride.id);

    for (const taxiGuest of taxiGuests) {
      await taxiRidesService.deleteGuest(taxiGuest.id);
    }

    await taxiRidesService.delete(ride.id);
  }

  const guests = await guestsService.getGuestsByRetreatId(retreatId);

  for (const guest of guests) {
    await guestsService.deleteGuest(guest.id);
  }
}

export async function restoreTestRetreatRooms(context: ServiceTestContext): Promise<void> {
  await configureTestRetreatRooms(context.retreat.id, context.rooms);
}

export async function cleanupServiceTestContext(context: ServiceTestContext): Promise<void> {
  await cleanupMutableRetreatData(context.retreat.id);
  const retreatRooms = await retreatRoomsService.getRetreatRooms(context.retreat.id);

  await retreatRoomsService.saveRetreatRooms(
    context.retreat.id,
    retreatRooms.map(item => ({
      roomId: item.room_id,
      isAvailable: false,
      maxGuests: item.max_guests,
    }))
  );

  await retreatsService.deleteRetreat(context.retreat.id);
}

export async function createTestGuest(
  context: ServiceTestContext,
  suffix: string,
  roomId: number | null = null
) {
  return guestsService.createGuest({
    retreat_id: context.retreat.id,
    name: `__TEST__ ${context.runId} ${suffix}`,
    room_id: roomId,
  }, context.adminUserId);
}

export async function getStatusCount(retreatId: number, guestId: number): Promise<number> {
  const statuses = await guestStatusesService.getGuestStatusesByRetreatId(retreatId);
  return statuses.filter(status => status.guest_id === guestId).length;
}

function findRoom(
  rooms: Room[],
  houseId: number,
  roomNumber: string,
  label: string
): Room {
  const room = rooms.find(item => (
    item.house_id === houseId && item.room_number === roomNumber
  ));

  if (!room) {
    throw new Error(`Test setup: room ${label} was not found.`);
  }

  if (!room.is_available) {
    throw new Error(`Test setup: room ${label} must be globally available.`);
  }

  return room;
}

async function configureTestRetreatRooms(
  retreatId: number,
  rooms: ServiceTestContext["rooms"]
): Promise<void> {
  await retreatRoomsService.saveRetreatRooms(retreatId, [
    { roomId: rooms.cubeA1.id, isAvailable: true, maxGuests: 2 },
    { roomId: rooms.cubeA2.id, isAvailable: true, maxGuests: 1 },
    { roomId: rooms.cubeB1.id, isAvailable: true, maxGuests: 1 },
    { roomId: rooms.cone1.id, isAvailable: true, maxGuests: 1 },
  ]);
}
