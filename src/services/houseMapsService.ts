import db from "./database";
import roomsService from "./roomsService";
import type { House, HouseMap, Room } from "./database";

export type RoomPosition = {
  room_id: number;
  x: number;
  y: number;
};

const houseMapsService = {
  getHouseMaps: async (): Promise<HouseMap[]> => {
    return db.houseMaps.getAll();
  },

  getHouseMapById: async (id: number): Promise<HouseMap | null> => {
    return db.houseMaps.getById(id);
  },

  getHouseMapByHouseId: async (houseId: number): Promise<HouseMap | null> => {
    return db.houseMaps.getByHouseId(houseId);
  },

  createHouseMap: async (
    houseId: number,
    bgImageUrl: string | null,
    roomPositions: RoomPosition[]
  ): Promise<HouseMap> => {
    return db.houseMaps.create({
      house_id: houseId,
      bg_image_url: bgImageUrl,
      room_positions: roomPositions,
    });
  },

  updateHouseMap: async (
    id: number,
    bgImageUrl: string | null,
    roomPositions: RoomPosition[]
  ): Promise<HouseMap> => {
    return db.houseMaps.update(id, {
      bg_image_url: bgImageUrl,
      room_positions: roomPositions,
    });
  },

  deleteHouseMap: async (id: number): Promise<void> => {
    return db.houseMaps.delete(id);
  },

  uploadBackground: async (houseId: number, file: File): Promise<string> => {
    return db.houseMapImages.upload(houseId, file);
  },

  // Для обычного house возвращает его комнаты, а для группы — комнаты всех непосредственных дочерних houses.
  getRoomsForHouseMap: (house: House, houses: House[], rooms: Room[]): Room[] => {
    const childHouses = houses.filter((item) => item.parent_id === house.id);
    const isHouseGroup = childHouses.length > 0;

    if (!isHouseGroup) {
      const houseRooms = rooms.filter((room) => room.house_id === house.id);
      return roomsService.sortRooms(houseRooms, houses);
    }

    const childHouseIds = childHouses.map((item) => item.id);
    const groupRooms = rooms.filter((room) => childHouseIds.includes(room.house_id));

    return roomsService.sortRooms(groupRooms, houses);
  },

  // На карте обычного house показывает только номер, а в группе — полное имя комнаты.
  getRoomLabel: (room: Room, mapHouse: House, houses: House[]): string => {
    const childHouses = houses.filter((item) => item.parent_id === mapHouse.id);
    const isHouseGroup = childHouses.length > 0;

    if (!isHouseGroup) {
      return room.room_number;
    }

    const roomHouse = houses.find((item) => item.id === room.house_id);

    if (!roomHouse) {
      return room.room_number;
    }

    return roomsService.getRoomDisplayName(room, roomHouse);
  },

  // Безопасно извлекает сохранённые координаты, сохраняя совместимость с пустыми или старыми записями карты.
  getRoomPositions: (houseMap: HouseMap | null): RoomPosition[] => {
    if (!houseMap || !Array.isArray(houseMap.room_positions)) {
      return [];
    }

    return houseMap.room_positions as RoomPosition[];
  },

  getUnplacedRooms: (rooms: Room[], roomPositions: RoomPosition[]): Room[] => {
    const placedRoomIds = roomPositions.map((position) => position.room_id);

    return rooms.filter((room) => !placedRoomIds.includes(room.id));
  },

  getRoomPosition: (roomId: number, roomPositions: RoomPosition[]): RoomPosition | null => {
    return roomPositions.find((position) => position.room_id === roomId) ?? null;
  },

  // Возвращает новый список координат: обновляет существующий маркер или добавляет новый.
  setRoomPosition: (
    roomId: number,
    x: number,
    y: number,
    roomPositions: RoomPosition[]
  ): RoomPosition[] => {
    const existingPosition = roomPositions.find((position) => position.room_id === roomId);

    if (existingPosition) {
      return roomPositions.map((position) => {
        if (position.room_id !== roomId) {
          return position;
        }

        return {
          room_id: roomId,
          x,
          y,
        };
      });
    }

    return [
      ...roomPositions,
      {
        room_id: roomId,
        x,
        y,
      },
    ];
  },

  removeRoomPosition: (roomId: number, roomPositions: RoomPosition[]): RoomPosition[] => {
    return roomPositions.filter((position) => position.room_id !== roomId);
  },
};

export default houseMapsService;