import db from "./database";
import type { CreateHouse, House, UpdateHouse } from "./database";

const housesService = {
  getHouses: async (): Promise<House[]> => {
    return db.houses.getAll();
  },

  getHouseById: async (id: number): Promise<House | null> => {
    return db.houses.getById(id);
  },

  getHousesByParentId: async (parentId: number): Promise<House[]> => {
    return db.houses.getByParentId(parentId);
  },

  createHouse: async (house: CreateHouse): Promise<House> => {
    return db.houses.create(house);
  },

  updateHouse: async (id: number, changes: UpdateHouse): Promise<House> => {
    return db.houses.update(id, changes);
  },

  deleteHouse: async (id: number): Promise<void> => {
    return db.houses.delete(id);
  },
};

export default housesService;