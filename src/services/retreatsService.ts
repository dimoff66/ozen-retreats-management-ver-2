import db from "./database";
import type {
  CreateRetreat,
  Retreat,
  UpdateRetreat,
} from "./database";

const retreatsService = {
  getRetreats: async (): Promise<Retreat[]> => {
    return db.retreats.getAll();
  },

  getRetreatById: async (id: number): Promise<Retreat | null> => {
    return db.retreats.getById(id);
  },

  getActiveRetreats: async (): Promise<Retreat[]> => {
    return db.retreats.getActive();
  },

  createRetreat: async (retreat: CreateRetreat): Promise<Retreat> => {
    return db.retreats.create(retreat);
  },

  updateRetreat: async (id: number, changes: UpdateRetreat): Promise<Retreat> => {
    return db.retreats.update(id, changes);
  },

  deleteRetreat: async (id: number): Promise<void> => {
    return db.retreats.delete(id);
  },
};

export default retreatsService;