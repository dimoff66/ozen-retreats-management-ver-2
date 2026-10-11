import { NextResponse } from "next/server";
import mariaDbServer from "@/server/mariaDatabase";
import { getAuthenticatedUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MariaDbRequest = {
  entity: string;
  action: string;
  args: unknown[];
};

type AsyncOperation = (...args: never[]) => Promise<unknown>;

const adminWriteEntities = new Set(["houses", "rooms", "houseMaps", "retreats", "retreatRooms"]);
const adminWriteActions = new Set(["create", "update", "delete"]);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown MariaDB error";
}

function isMariaDbRequest(value: unknown): value is MariaDbRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Record<string, unknown>;

  return (
    typeof request.entity === "string" &&
    typeof request.action === "string" &&
    Array.isArray(request.args)
  );
}

export async function POST(request: Request) {
  try {
    if (process.env.MARIADB_API_ENABLED !== "true") {
      return NextResponse.json(
        { error: "MariaDB API is disabled" },
        { status: 503 }
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json() as unknown;

    if (!isMariaDbRequest(body)) {
      return NextResponse.json(
        { error: "Invalid MariaDB request" },
        { status: 400 }
      );
    }

    const requiresAdmin = body.entity === "users" ||
      (body.entity === "taxiRides" && body.action === "createRides") ||
      (adminWriteEntities.has(body.entity) && adminWriteActions.has(body.action));

    if (requiresAdmin && user.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    const entities = mariaDbServer as unknown as Record<string, Record<string, unknown>>;

    if (!Object.prototype.hasOwnProperty.call(entities, body.entity)) {
      return NextResponse.json(
        { error: "Unknown MariaDB entity" },
        { status: 404 }
      );
    }

    const entity = entities[body.entity];

    if (!Object.prototype.hasOwnProperty.call(entity, body.action)) {
      return NextResponse.json(
        { error: "Unknown MariaDB operation" },
        { status: 404 }
      );
    }

    const operation = entity[body.action];

    if (typeof operation !== "function") {
      return NextResponse.json(
        { error: "Unknown MariaDB operation" },
        { status: 404 }
      );
    }

    const data = await (operation as AsyncOperation)(...(body.args as never[]));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
