import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxImageBytes = 10 * 1024 * 1024;
const allowedImageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

function getFileExtension(fileName: string): string {
  const extension = path.extname(fileName).slice(1).toLowerCase();

  if (!allowedImageExtensions.has(extension)) {
    throw new Error("House map image must be JPG, PNG or WebP");
  }

  return extension;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown image upload error";
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

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const houseIdValue = formData.get("houseId");
    const fileValue = formData.get("file");
    const houseId = Number(houseIdValue);

    if (!Number.isInteger(houseId) || houseId <= 0) {
      return NextResponse.json({ error: "Invalid house id" }, { status: 400 });
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!allowedImageTypes.has(fileValue.type)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }

    if (fileValue.size > maxImageBytes) {
      return NextResponse.json({ error: "Image is larger than 10 MB" }, { status: 400 });
    }

    const uploadRoot = getRequiredEnv("HOUSE_MAP_UPLOAD_DIR");
    const publicBaseUrl = getRequiredEnv("HOUSE_MAP_UPLOAD_BASE_URL").replace(/\/$/, "");
    const extension = getFileExtension(fileValue.name);
    const houseDirectory = path.join(uploadRoot, String(houseId));
    const fileName = `background.${extension}`;
    const filePath = path.join(houseDirectory, fileName);
    const buffer = Buffer.from(await fileValue.arrayBuffer());

    await mkdir(houseDirectory, { recursive: true });
    await writeFile(filePath, buffer);

    return NextResponse.json({
      data: `${publicBaseUrl}/${houseId}/${fileName}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
