import { createClient } from "@supabase/supabase-js";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import type { ManagedUser, User } from "@/services/database";
import { getMariaDbPool } from "@/server/mariaDbPool";

export type StoredUser = User & {
  password: string;
  link_code: string | null;
};

export type StoredUserCreate = {
  name: string;
  login: string;
  password: string;
  role: string;
  retreat_id: number | null;
  link_code: string | null;
};

export type StoredUserUpdate = Partial<StoredUserCreate>;

export function toPublicUser(user: StoredUser): User {
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    role: user.role,
    retreat_id: user.retreat_id,
    created_at: user.created_at,
  };
}

export function toManagedUser(user: StoredUser): ManagedUser {
  return {
    ...toPublicUser(user),
    link_code: user.link_code,
  };
}

const PUBLIC_USER_COLUMNS = "id,name,login,role,retreat_id,created_at";
const ADMIN_USER_COLUMNS = "id,name,login,role,retreat_id,created_at,link_code";
const PRIVATE_USER_COLUMNS = "id,name,login,password,role,retreat_id,created_at,link_code";

function useMariaDb(): boolean {
  return process.env.MARIADB_API_ENABLED === "true";
}

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined.");
  }

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    name: String(row.name),
    login: String(row.login),
    role: String(row.role),
    retreat_id: row.retreat_id === null ? null : Number(row.retreat_id),
    created_at: String(row.created_at),
  };
}

function toStoredUser(row: Record<string, unknown>): StoredUser {
  return {
    ...toUser(row),
    password: String(row.password),
    link_code: row.link_code === null || row.link_code === undefined ? null : String(row.link_code),
  };
}

function toManagedUserRow(row: Record<string, unknown>): ManagedUser {
  return {
    ...toUser(row),
    link_code: row.link_code === null || row.link_code === undefined ? null : String(row.link_code),
  };
}

function getMariaRow(row: RowDataPacket): Record<string, unknown> {
  return row as Record<string, unknown>;
}

async function getMariaStoredUserById(id: number): Promise<StoredUser | null> {
  const [rows] = await getMariaDbPool().execute<RowDataPacket[]>(
    `select ${PRIVATE_USER_COLUMNS} from \`users\` where id = ? limit 1`,
    [id]
  );

  return rows[0] ? toStoredUser(getMariaRow(rows[0])) : null;
}

async function getMariaStoredUserByLogin(login: string): Promise<StoredUser | null> {
  const [rows] = await getMariaDbPool().execute<RowDataPacket[]>(
    `select ${PRIVATE_USER_COLUMNS} from \`users\` where login = ? limit 1`,
    [login]
  );

  return rows[0] ? toStoredUser(getMariaRow(rows[0])) : null;
}

async function getMariaStoredUserByLinkCode(linkCode: string): Promise<StoredUser | null> {
  const [rows] = await getMariaDbPool().execute<RowDataPacket[]>(
    `select ${PRIVATE_USER_COLUMNS} from \`users\` where binary link_code = ? limit 1`,
    [linkCode]
  );

  return rows[0] ? toStoredUser(getMariaRow(rows[0])) : null;
}

const authUserStore = {
  getAll: async (): Promise<User[]> => {
    if (useMariaDb()) {
      const [rows] = await getMariaDbPool().execute<RowDataPacket[]>(
        `select ${PUBLIC_USER_COLUMNS} from \`users\` order by name`
      );

      return rows.map((row) => toUser(getMariaRow(row)));
    }

    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .select(PUBLIC_USER_COLUMNS)
      .order("name");

    if (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }

    return (data ?? []).map((row) => toUser(row));
  },

  getAllForAdmin: async (): Promise<ManagedUser[]> => {
    if (useMariaDb()) {
      const [rows] = await getMariaDbPool().execute<RowDataPacket[]>(
        `select ${ADMIN_USER_COLUMNS} from \`users\` order by name`
      );

      return rows.map((row) => toManagedUserRow(getMariaRow(row)));
    }

    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .select(ADMIN_USER_COLUMNS)
      .order("name");

    if (error) {
      throw new Error(`Failed to get managed users: ${error.message}`);
    }

    return (data ?? []).map((row) => toManagedUserRow(row));
  },

  getById: async (id: number): Promise<StoredUser | null> => {
    if (useMariaDb()) {
      return getMariaStoredUserById(id);
    }

    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .select(PRIVATE_USER_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data ? toStoredUser(data) : null;
  },

  getByLogin: async (login: string): Promise<StoredUser | null> => {
    if (useMariaDb()) {
      return getMariaStoredUserByLogin(login);
    }

    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .select(PRIVATE_USER_COLUMNS)
      .eq("login", login)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get user by login: ${error.message}`);
    }

    return data ? toStoredUser(data) : null;
  },

  getByLinkCode: async (linkCode: string): Promise<StoredUser | null> => {
    if (useMariaDb()) {
      return getMariaStoredUserByLinkCode(linkCode);
    }

    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .select(PRIVATE_USER_COLUMNS)
      .eq("link_code", linkCode)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get user by link code: ${error.message}`);
    }

    return data ? toStoredUser(data) : null;
  },

  create: async (user: StoredUserCreate): Promise<StoredUser> => {
    if (useMariaDb()) {
      const [result] = await getMariaDbPool().execute<ResultSetHeader>(
        "insert into `users` (name, login, password, role, retreat_id, link_code) values (?, ?, ?, ?, ?, ?)",
        [user.name, user.login, user.password, user.role, user.retreat_id, user.link_code]
      );
      const storedUser = await getMariaStoredUserById(result.insertId);

      if (!storedUser) {
        throw new Error("Failed to read created user.");
      }

      return storedUser;
    }

    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .insert(user)
      .select(PRIVATE_USER_COLUMNS)
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return toStoredUser(data);
  },

  update: async (id: number, changes: StoredUserUpdate): Promise<StoredUser> => {
    if (useMariaDb()) {
      const entries = Object.entries(changes).filter(([, value]) => value !== undefined);

      if (entries.length > 0) {
        const allowedColumns = new Set(["name", "login", "password", "role", "retreat_id", "link_code"]);
        const filteredEntries = entries.filter(([key]) => allowedColumns.has(key));
        const assignments = filteredEntries.map(([key]) => `\`${key}\` = ?`).join(", ");
        const values = filteredEntries.map(([, value]) => value);

        if (assignments) {
          await getMariaDbPool().execute<ResultSetHeader>(
            `update \`users\` set ${assignments} where id = ?`,
            [...values, id]
          );
        }
      }

      const storedUser = await getMariaStoredUserById(id);

      if (!storedUser) {
        throw new Error(`User ${id} was not found.`);
      }

      return storedUser;
    }

    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .update(changes)
      .eq("id", id)
      .select(PRIVATE_USER_COLUMNS)
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return toStoredUser(data);
  },

  delete: async (id: number): Promise<void> => {
    if (useMariaDb()) {
      await getMariaDbPool().execute<ResultSetHeader>(
        "delete from `users` where id = ?",
        [id]
      );
      return;
    }

    const { error } = await getSupabaseServerClient()
      .from("users")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  },
};

export default authUserStore;
