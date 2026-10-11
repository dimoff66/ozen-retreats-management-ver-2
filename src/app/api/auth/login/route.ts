import { NextResponse } from "next/server";
import { hashPassword, isPasswordHash, verifyPassword } from "@/server/auth/password";
import { setSessionCookie } from "@/server/auth/session";
import authUserStore from "@/server/auth/userStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PASSWORD_LENGTH = 256;

type LoginRequest = {
  login?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as LoginRequest;
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!login || !password || password.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json({ error: "Invalid login or password." }, { status: 401 });
    }

    let user = await authUserStore.getByLogin(login);

    if (!user || !await verifyPassword(password, user.password)) {
      return NextResponse.json({ error: "Invalid login or password." }, { status: 401 });
    }

    if (!isPasswordHash(user.password)) {
      user = await authUserStore.update(user.id, {
        password: await hashPassword(password),
      });
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        login: user.login,
        role: user.role,
        retreat_id: user.retreat_id,
        created_at: user.created_at,
      },
    });

    setSessionCookie(response, user);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
