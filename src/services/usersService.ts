import db from "./database";
import type { User } from "./database";

const usersService = {
  getUserById: async (id: number): Promise<User | null> => db.users.getById(id),
  getDevelopmentAdmin: async (): Promise<User | null> => {
    const user = await db.users.getByLogin("admin");
    return user?.role === "admin" ? user : null;
  },
};

export default usersService;
