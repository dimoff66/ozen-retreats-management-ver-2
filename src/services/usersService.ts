import type { CreateUser, UpdateUser, User } from "./database";

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
  getUsers: async (): Promise<User[]> => {
    return requestUsersApi<User[]>("GET");
  },

  createUser: async (user: CreateUser): Promise<User> => {
    return requestUsersApi<User>("POST", user);
  },

  updateUser: async (id: number, changes: UpdateUser): Promise<User> => {
    return requestUsersApi<User>("PATCH", { id, changes });
  },

  deleteUser: async (id: number): Promise<void> => {
    await requestUsersApi<null>("DELETE", { id });
  },
};

export default usersService;
