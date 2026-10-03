import db from "./database";
import type { User } from "./database";

const usersService = {
  getUsers: async (): Promise<User[]> => {
    return db.users.getAll();
  },

  getUserById: async (id: number): Promise<User | null> => {
    return db.users.getById(id);
  },

  getUserByLogin: async (login: string): Promise<User | null> => {
    return db.users.getByLogin(login);
  },
};

export default usersService;