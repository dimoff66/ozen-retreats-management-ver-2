import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();

  return NextResponse.json({
    imageImportAvailable: user?.role === "admin" && Boolean(process.env.REPLICATE_API_TOKEN),
  });
}
