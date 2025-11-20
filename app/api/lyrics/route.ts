import { type NextRequest, NextResponse } from "next/server";

// @ts-ignore - genius-lyrics-api não tem tipos TypeScript
const { getLyrics } = require("genius-lyrics-api");

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

    const GENIUS_API_KEY = process.env.GENIUS_API_KEY;

    if (!GENIUS_API_KEY) {
      return NextResponse.json(
        { error: "Genius API key não configurada" },
        { status: 500 }
      );
    }

    const options = {
      apiKey: GENIUS_API_KEY,
      title: musica,
      artist: artista,
      optimizeQuery: true, // Tenta limpar o título (tira "feat.", "Live", etc) para achar mais fácil
    };
    console.log(options);
    console.log(GENIUS_API_KEY);
    try {
      const lyrics = await getLyrics(options);

      if (!lyrics) {
        return NextResponse.json(
          { error: "Letra não encontrada no Genius" },
          { status: 404 }
        );
      }

      return NextResponse.json({ lyrics });
    } catch (error) {
      console.error("Erro ao buscar letra no Genius:", error);
      return NextResponse.json(
        { error: "Erro ao buscar letra no Genius" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erro na API de letras:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
