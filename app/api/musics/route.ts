import { type NextRequest, NextResponse } from "next/server";

const EXPRESS_API_URL = process.env.EXPRESS_API_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "12";
    const artista = searchParams.get("artista");
    const musica = searchParams.get("musica");
    const id = searchParams.get("id");
    const numero = searchParams.get("numero");

    // Build query string for Express API
    const queryParams = new URLSearchParams({
      page,
      limit,
    });

    if (artista) queryParams.append("artista", artista);
    if (musica) queryParams.append("musica", musica);
    if (id) queryParams.append("id", id);
    if (numero) queryParams.append("numero", numero);

    const apiUrl = `${EXPRESS_API_URL}/musics?${queryParams.toString()}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json; charset=utf-8",
      },
    });

    if (!response.ok) {
      throw new Error(`Express API returned ${response.status}`);
    }

    // Get response as text first to ensure proper encoding
    const text = await response.text();
    const data = JSON.parse(text);

    // Ensure UTF-8 encoding in response
    return NextResponse.json(data, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error fetching musics from Express API:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch musics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
