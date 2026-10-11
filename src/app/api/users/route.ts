import { NextResponse } from "next/server";
import type { CreateUser, UpdateUser } from "@/services/database";
import { hashPassword } from "@/server/auth/password";
import { getAuthenticatedStoredUser, setSessionCookie } from "@/server/auth/session";
import authUserStore, { toPublicUser } from "@/server/auth/userStore";
import type { StoredUser, StoredUserCreate, StoredUserUpdate } from "@/server/auth/userStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;

type UpdateRequest = {
  id?: unknown;
  changes?: unknown;
};

type DeleteRequest = {
  id?: unknown;
};

type AdminAuthResult =
  | { user: StoredUser; response: null }
  | { user: null; response: NextResponse };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "User operation failed.";
}

function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must contain no more than ${MAX_PASSWORD_LENGTH} characters.`;
  }

  return null;
}

function getUserFields(value: unknown): Omit<StoredUserCreate, "password"> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const login = typeof record.login === "string" ? record.login.trim() : "";
  const role = typeof record.role === "string" ? record.role.trim() : "";
  const retreatId = record.retreat_id === null || record.retreat_id === undefined
    ? null
    : Number(record.retreat_id);

  if (!name || !login || !role || (retreatId !== null && !Number.isInteger(retreatId))) {
    return null;
  }

  return {
    name,
    login,
    role,
    retreat_id: retreatId,
  };
}

async function getAdminUser(): Promise<AdminAuthResult> {
  const user = await getAuthenticatedStoredUser();

  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (user.role !== "admin") {
    return { user: null, response: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) };
  }

  return { user, response: null };
}

export async function GET() {
  try {
    const auth = await getAdminUser();

    if (auth.response) {
      return auth.response;
    }

    return NextResponse.json({ data: await authUserStore.getAll() });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAdminUser();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json() as CreateUser;
    const fields = getUserFields(body);
    const password = typeof body.password === "string" ? body.password : "";
    const passwordError = validatePassword(password);

    if (!fields) {
      return NextResponse.json({ error: "Invalid user data." }, { status: 400 });
    }

    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const storedUser = await authUserStore.create({
      ...fields,
      password: await hashPassword(password),
    });
    return NextResponse.json({ data: toPublicUser(storedUser) });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAdminUser();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json() as UpdateRequest;
    const id = Number(body.id);

    if (!Number.isInteger(id) || !body.changes || typeof body.changes !== "object") {
      return NextResponse.json({ error: "Invalid user update." }, { status: 400 });
    }

    const input = body.changes as UpdateUser;
    const changes: StoredUserUpdate = {};

    if (input.name !== undefined) {
      const name = input.name.trim();

      if (!name) {
        return NextResponse.json({ error: "Name is required." }, { status: 400 });
      }

      changes.name = name;
    }

    if (input.login !== undefined) {
      const login = input.login.trim();

      if (!login) {
        return NextResponse.json({ error: "Login is required." }, { status: 400 });
      }

      changes.login = login;
    }

    if (input.role !== undefined) {
      const role = input.role.trim();

      if (!role) {
        return NextResponse.json({ error: "Role is required." }, { status: 400 });
      }

      changes.role = role;
    }

    if (input.retreat_id !== undefined) {
      const retreatId = input.retreat_id === null ? null : Number(input.retreat_id);

      if (retreatId !== null && !Number.isInteger(retreatId)) {
        return NextResponse.json({ error: "Invalid retreat." }, { status: 400 });
      }

      changes.retreat_id = retreatId;
    }

    if (input.password !== undefined) {
      const passwordError = validatePassword(input.password);

      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }

      changes.password = await hashPassword(input.password);
    }

    const storedUser = await authUserStore.update(id, changes);
    const response = NextResponse.json({ data: toPublicUser(storedUser) });

    if (auth.user.id === storedUser.id) {
      setSessionCookie(response, storedUser);
    }

    return response;
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAdminUser();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json() as DeleteRequest;
    const id = Number(body.id);

    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
    }

    if (id === auth.user.id) {
      return NextResponse.json({ error: "You cannot delete your own user." }, { status: 400 });
    }

    await authUserStore.delete(id);
    return NextResponse.json({ data: null });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
