import db from "./database";
import type { CreateRoom, House, Room, UpdateRoom } from "./database";

let roomsCache: Room[] | null = null;
let roomsRequest: Promise<Room[]> | null = null;

// Комнаты являются справочными данными: читаем список один раз и перечитываем только после изменений.
async function loadRooms(force = false): Promise<Room[]> {
  if (!force && roomsCache) {
    return roomsCache;
  }

  if (!force && roomsRequest) {
    return roomsRequest;
  }

  const request = db.rooms.getAll();
  roomsRequest = request;

  try {
    roomsCache = await request;
    return roomsCache;
  } finally {
    if (roomsRequest === request) {
      roomsRequest = null;
    }
  }
}

const roomsService = {
  getRooms: async (): Promise<Room[]> => {
    return loadRooms();
  },

  getRoomById: async (id: number): Promise<Room | null> => {
    return db.rooms.getById(id);
  },

  getRoomsByHouseId: async (houseId: number): Promise<Room[]> => {
    return db.rooms.getByHouseId(houseId);
  },

  createRoom: async (room: CreateRoom): Promise<Room> => {
    const createdRoom = await db.rooms.create(room);
    await loadRooms(true);
    return createdRoom;
  },

  updateRoom: async (id: number, changes: UpdateRoom): Promise<Room> => {
    const updatedRoom = await db.rooms.update(id, changes);
    await loadRooms(true);
    return updatedRoom;
  },

  deleteRoom: async (id: number): Promise<void> => {
    await db.rooms.delete(id);
    await loadRooms(true);
  },

  // Формирует принятое в UI имя комнаты: Buddhas 3 -> Buddha 3, остальные houses склеиваются с номером.
  getRoomDisplayName: (room: Room, house: House): string => {
    const houseNameEndsWithS = house.name.endsWith("s");

    if (houseNameEndsWithS) {
      const houseName = house.name.slice(0, -1);
      return `${houseName} ${room.room_number}`;
    }

    return `${house.name}${room.room_number}`;
  },

  // Сортирует комнаты по house, буквенной части номера и затем по числовой части (A2 раньше A10).
  sortRooms: (rooms: Room[], houses: House[]): Room[] => {
    const getSortValues = (room: Room) => {
      const match = room.room_number.match(/^([A-Za-z]*)(\d+)/);
      const letterPrefix = match?.[1] ?? "";
      const numericPart = match?.[2] ? Number(match[2]) : 0;

      return {
        houseId: houses.find(item => item.id === room.house_id)?.id ?? room.house_id,
        letterPrefix,
        numericPart,
        roomNumber: room.room_number,
      };
    };

    return [...rooms].sort((roomA, roomB) => {
      const sortA = getSortValues(roomA);
      const sortB = getSortValues(roomB);

      const houseCompare = sortA.houseId - sortB.houseId;

      if (houseCompare !== 0) {
        return houseCompare;
      }

      const letterCompare = sortA.letterPrefix.localeCompare(sortB.letterPrefix);

      if (letterCompare !== 0) {
        return letterCompare;
      }

      const numberCompare = sortA.numericPart - sortB.numericPart;

      if (numberCompare !== 0) {
        return numberCompare;
      }

      return sortA.roomNumber.localeCompare(sortB.roomNumber);
    });
  },
};

export default roomsService;