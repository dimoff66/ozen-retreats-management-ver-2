import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { User } from "@/services/database";
import authUserStore, { toPublicUser } from "@/server/auth/userStore";
import type { StoredUser } from "@/server/auth/userStore";

const SESSION_COOKIE_NAME = "project_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

type SessionPayload = {
  userId: number;
  passwordVersion: string;
  expiresAt: number;
};

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SESSION_SECRET must contain at least 32 characters.");
  }

  return secret;
}

function getPasswordVersion(password: string): string {
  return createHash("sha256").update(password).digest("base64url");
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function createSessionToken(user: StoredUser): string {
  const payload: SessionPayload = {
    userId: user.id,
    passwordVersion: getPasswordVersion(user.password),
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function parseSessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature, extra] = token.split(".");

  if (!encodedPayload || !signature || extra !== undefined) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<SessionPayload>;

    if (
      typeof payload.userId !== "number" ||
      typeof payload.passwordVersion !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, user: StoredUser): void {
  const token = createSessionToken(user);

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getAuthenticatedUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = parseSessionToken(token);

  if (!payload) {
    return null;
  }

  const user = await authUserStore.getById(payload.userId);

  if (!user || payload.passwordVersion !== getPasswordVersion(user.password)) {
    return null;
  }

  return toPublicUser(user);
}

export async function getAuthenticatedStoredUser(): Promise<StoredUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = parseSessionToken(token);

  if (!payload) {
    return null;
  }

  const user = await authUserStore.getById(payload.userId);

  if (!user || payload.passwordVersion !== getPasswordVersion(user.password)) {
    return null;
  }

  return user;
}
