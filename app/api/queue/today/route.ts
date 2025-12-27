import { type NextRequest, NextResponse } from "next/server";

const EXPRESS_API_URL = process.env.EXPRESS_API_URL;

// Helper para normalizar URL (remove barra final se existir)
function normalizeUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl) throw new Error("EXPRESS_API_URL não está definida");
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export async function GET(request: NextRequest) {
  try {
    const apiUrl = normalizeUrl(EXPRESS_API_URL, "queue/today");
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log("response", response);
    if (!response.ok) {
      throw new Error(`Express API returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error fetching queue from Express API:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch queue",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
