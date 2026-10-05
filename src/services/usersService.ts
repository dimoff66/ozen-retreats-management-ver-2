import db from "./database";
import type { CreateUser, UpdateUser, User } from "./database";

const usersService = {
  getUsers: async (): Promise<User[]> => {
    return db.users.getAll();
  },

  createUser: async (user: CreateUser): Promise<User> => {
    return db.users.create(user);
  },

  updateUser: async (id: number, changes: UpdateUser): Promise<User> => {
    return db.users.update(id, changes);
  },

  deleteUser: async (id: number): Promise<void> => {
    return db.users.delete(id);
  },

  getUserById: async (id: number): Promise<User | null> => {
    return db.users.getById(id);
  },

  getUserByLogin: async (login: string): Promise<User | null> => {
    return db.users.getByLogin(login);
  },
};

export default usersService;