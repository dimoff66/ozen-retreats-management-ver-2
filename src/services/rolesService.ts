import db from "./database";
import type { Role } from "./database";

const rolesService = {
  getRoles: async (): Promise<Role[]> => {
    return db.roles.getAll();
  },
};

export default rolesService;
