import { type NextRequest, NextResponse } from "next/server";

// Força renderização dinâmica para evitar cache
export const dynamic = "force-dynamic";

async function getLyricsFromGenius(
  apiKey: string,
  artist: string,
  title: string
): Promise<string> {
  // 1. Buscar a música na API do Genius
  const searchQuery = `${artist} ${title}`;
  const searchUrl = `https://api.genius.com/search?access_token=${apiKey}&q=${encodeURIComponent(
    searchQuery
  )}`;

  const searchResponse = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LyricsBot/1.0)",
    },
  });

  if (!searchResponse.ok) {
    throw new Error(
      `Genius API search failed: ${searchResponse.status} ${searchResponse.statusText}`
    );
  }

  const searchData = await searchResponse.json();
  const hits = searchData?.response?.hits;

  if (!hits || hits.length === 0) {
    throw new Error("Música não encontrada no Genius");
  }

  // Pegar o primeiro resultado
  const song = hits[0].result;
  const songUrl = song.url;

  // 2. Buscar a página da música e extrair letras
  const pageResponse = await fetch(songUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!pageResponse.ok) {
    throw new Error(
      `Failed to fetch song page: ${pageResponse.status} ${pageResponse.statusText}`
    );
  }

  const html = await pageResponse.text();

  // 3. Extrair letras do HTML
  // As letras do Genius estão em uma div com data-lyrics-container
  let lyricsMatch = html.match(
    /<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/i
  );

  if (!lyricsMatch) {
    // Tentar outras variações
    lyricsMatch = html.match(
      /<div[^>]*class="[^"]*Lyrics__Container[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
  }

  if (!lyricsMatch) {
    // Último fallback: buscar por qualquer div com "lyrics" no class
    lyricsMatch = html.match(
      /<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
  }

  if (lyricsMatch) {
    // Limpar HTML tags, decodificar entidades e formatar
    let lyrics = lyricsMatch[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (lyrics.length > 0) {
      return lyrics;
    }
  }

  throw new Error("Não foi possível extrair as letras da página do Genius");
}

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

    const apiKey = process.env.GENIUS_API_KEY;

    if (!apiKey) {
      console.error("GENIUS_API_KEY não configurada");
      return NextResponse.json(
        {
          error: "API key não configurada",
          message:
            "GENIUS_API_KEY não está definida nas variáveis de ambiente. Configure no painel do Vercel em Settings > Environment Variables.",
        },
        { status: 500 }
      );
    }

    console.log("Buscando letras para:", {
      artista,
      musica,
      hasApiKey: !!apiKey,
    });

    const lyrics = await getLyricsFromGenius(apiKey, artista, musica);

    return NextResponse.json({ lyrics });
  } catch (error: any) {
    console.error("Error fetching lyrics:", {
      message: error?.message,
      status: error?.status,
      stack: error?.stack,
    });

    const statusCode = error?.status || 500;
    const errorMessage = error?.message || "Unknown error";

    // Mensagem mais específica para 403
    if (statusCode === 403 || errorMessage.includes("403")) {
      return NextResponse.json(
        {
          error: "Acesso negado pela API do Genius",
          message:
            "Erro 403: A API do Genius está bloqueando a requisição. Isso pode acontecer se a API key estiver incorreta ou se houver restrições de acesso.",
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch lyrics",
        message: errorMessage,
        statusCode,
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    );
  }
}
