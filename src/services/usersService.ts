import type { CreateUser, ManagedUser, UpdateUser } from "./database";

type UsersApiResponse<T> = {
  data?: T;
  error?: string;
};

async function requestUsersApi<T>(method: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/users", {
    method,
    headers: body === undefined ? undefined : {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json() as UsersApiResponse<T>;

  if (!response.ok) {
    throw new Error(payload.error ?? "User operation failed.");
  }

  return payload.data as T;
}

const usersService = {
  getUsers: async (): Promise<ManagedUser[]> => {
    return requestUsersApi<ManagedUser[]>("GET");
  },

  createUser: async (user: CreateUser): Promise<ManagedUser> => {
    return requestUsersApi<ManagedUser>("POST", user);
  },

  updateUser: async (id: number, changes: UpdateUser): Promise<ManagedUser> => {
    return requestUsersApi<ManagedUser>("PATCH", { id, changes });
  },

  deleteUser: async (id: number): Promise<void> => {
    await requestUsersApi<null>("DELETE", { id });
  },
};

export default usersService;
