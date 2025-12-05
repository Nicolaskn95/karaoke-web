import { type NextRequest, NextResponse } from "next/server";
import { getLyrics } from "genius-lyrics-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artista = searchParams.get("artista");
    const musica = searchParams.get("musica");

    if (!artista || !musica) {
      return NextResponse.json(
        { error: "Artista e música são obrigatórios" },
        { status: 400 }
      );
    }

    const lyrics = await getLyrics({
      apiKey: process.env.GENIUS_API_KEY || "",
      title: musica,
      artist: artista,
      optimizeQuery: true,
    });

    return NextResponse.json({ lyrics });
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch lyrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
