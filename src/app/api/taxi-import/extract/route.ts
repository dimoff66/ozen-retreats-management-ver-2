import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const MARKER_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          group: {
            type: "integer",
            description: "Taxi, car or group number only. Extract only the integer, without notes or times.",
          },
          approxTime: {
            type: "string",
            description: "Approximate or estimated taxi arrival time, for example 10:00.",
          },
          name: {
            type: "string",
            description: "Passenger or guest name exactly as written.",
          },
          time: {
            type: "string",
            description: "Passenger departure, pickup or source time exactly as written.",
          },
          houseCode: {
            type: "string",
            description: "Room, house, hotel or accommodation value exactly as written.",
          },
        },
        required: ["group", "approxTime", "name", "time", "houseCode"],
      },
    },
  },
  required: ["rows"],
});

type ReplicateFileResponse = {
  id: string;
  urls?: {
    get?: string;
  };
};

type ReplicatePredictionResponse = {
  id: string;
  status: string;
  error?: string | null;
  output?: {
    extraction_schema_json?: string | null;
  } | null;
  urls?: {
    get?: string;
  };
};

type MarkerExtractionRows = {
  rows?: Array<Record<string, unknown>>;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown extraction error";
}

function ensureToken(): string {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    throw new Error("Image import is not configured.");
  }

  return token;
}

async function replicateFetch(
  token: string,
  url: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}

async function uploadFile(token: string, file: File): Promise<ReplicateFileResponse> {
  const formData = new FormData();
  formData.append("content", file, file.name || "taxi-import-image.png");

  const response = await replicateFetch(token, "https://api.replicate.com/v1/files", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate file upload failed: ${errorText}`);
  }

  return response.json() as Promise<ReplicateFileResponse>;
}

async function createPrediction(
  token: string,
  fileUrl: string
): Promise<ReplicatePredictionResponse> {
  const response = await replicateFetch(
    token,
    "https://api.replicate.com/v1/models/datalab-to/marker/predictions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          file: fileUrl,
          mode: "accurate",
          force_ocr: true,
          use_llm: true,
          disable_image_extraction: true,
          page_schema: MARKER_SCHEMA,
          block_correction_prompt: [
            "Extract the passenger table exactly as shown in the image.",
            "Return one row per passenger.",
            "Keep names, times and room or accommodation values exactly as written.",
            "Column headers may use different wording. Identify columns by meaning, not exact header names.",
            "group is only the taxi, car or group integer; if a cell says '1 (aprox 10:00)', group is 1.",
            "approxTime is the estimated or approximate taxi arrival time.",
            "time is the passenger departure, pickup or source time.",
            "houseCode is the room, house, hotel or accommodation value.",
            "Map the table to the fields group, approxTime, name, time and houseCode.",
          ].join(" "),
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate prediction failed: ${errorText}`);
  }

  return response.json() as Promise<ReplicatePredictionResponse>;
}

async function getPrediction(token: string, url: string): Promise<ReplicatePredictionResponse> {
  const response = await replicateFetch(token, url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate prediction polling failed: ${errorText}`);
  }

  return response.json() as Promise<ReplicatePredictionResponse>;
}

async function waitForPrediction(
  token: string,
  prediction: ReplicatePredictionResponse
): Promise<ReplicatePredictionResponse> {
  let currentPrediction = prediction;

  for (let index = 0; index < 15; index += 1) {
    if (currentPrediction.status === "succeeded") {
      return currentPrediction;
    }

    if (currentPrediction.status === "failed" || currentPrediction.status === "canceled") {
      throw new Error(currentPrediction.error || "Replicate prediction failed.");
    }

    if (!currentPrediction.urls?.get) {
      throw new Error("Replicate prediction polling URL is missing.");
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    currentPrediction = await getPrediction(token, currentPrediction.urls.get);
  }

  throw new Error("Replicate prediction timed out.");
}

async function deleteUploadedFile(token: string, fileId: string): Promise<void> {
  await replicateFetch(token, `https://api.replicate.com/v1/files/${fileId}`, {
    method: "DELETE",
  });
}

function getStringCell(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function convertExtractionToTsv(extractionSchemaJson: string | null | undefined): string {
  if (!extractionSchemaJson) {
    throw new Error("Replicate did not return extracted rows.");
  }

  const parsed = JSON.parse(extractionSchemaJson) as MarkerExtractionRows;
  const rows = Array.isArray(parsed.rows) ? parsed.rows : [];

  if (rows.length === 0) {
    throw new Error("No taxi rows were found in the image.");
  }

  const header = ["group", "approxTime", "name", "time", "houseCode"].join("\t");
  const body = rows.map((row) => (
    [
      getStringCell(row.group),
      getStringCell(row.approxTime),
      getStringCell(row.name),
      getStringCell(row.time),
      getStringCell(row.houseCode),
    ].join("\t")
  ));

  return [header, ...body].join("\n");
}

export async function POST(request: Request) {
  let uploadedFileId: string | null = null;

  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    const token = ensureToken();
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are supported." }, { status: 400 });
    }

    if (image.size === 0) {
      return NextResponse.json({ error: "The image file is empty." }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "The image is too large. Maximum size is 4 MB." },
        { status: 400 }
      );
    }

    const uploadedFile = await uploadFile(token, image);
    uploadedFileId = uploadedFile.id;
    const fileUrl = uploadedFile.urls?.get;

    if (!fileUrl) {
      throw new Error("Replicate file URL is missing.");
    }

    const createdPrediction = await createPrediction(token, fileUrl);
    const completedPrediction = await waitForPrediction(token, createdPrediction);
    const text = convertExtractionToTsv(
      completedPrediction.output?.extraction_schema_json
    );

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  } finally {
    if (uploadedFileId) {
      const token = process.env.REPLICATE_API_TOKEN;

      if (token) {
        try {
          await deleteUploadedFile(token, uploadedFileId);
        } catch {
          // Ignore cleanup errors.
        }
      }
    }
  }
}
