import db from "./database";
import type { CreateHouse, House, UpdateHouse } from "./database";

let housesCache: House[] | null = null;
let housesRequest: Promise<House[]> | null = null;

// Дома являются справочными данными: читаем список один раз и перечитываем только после изменений.
async function loadHouses(force = false): Promise<House[]> {
  if (!force && housesCache) {
    return housesCache;
  }

  if (!force && housesRequest) {
    return housesRequest;
  }

  const request = db.houses.getAll();
  housesRequest = request;

  try {
    housesCache = await request;
    return housesCache;
  } finally {
    if (housesRequest === request) {
      housesRequest = null;
    }
  }
}

const housesService = {
  getHouses: async (): Promise<House[]> => {
    return loadHouses();
  },

  getHouseById: async (id: number): Promise<House | null> => {
    return db.houses.getById(id);
  },

  getHousesByParentId: async (parentId: number): Promise<House[]> => {
    return db.houses.getByParentId(parentId);
  },

  createHouse: async (house: CreateHouse): Promise<House> => {
    const createdHouse = await db.houses.create(house);
    await loadHouses(true);
    return createdHouse;
  },

  updateHouse: async (id: number, changes: UpdateHouse): Promise<House> => {
    const updatedHouse = await db.houses.update(id, changes);
    await loadHouses(true);
    return updatedHouse;
  },

  deleteHouse: async (id: number): Promise<void> => {
    await db.houses.delete(id);
    await loadHouses(true);
  },
};

export default housesService;
