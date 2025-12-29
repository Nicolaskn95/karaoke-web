import { type NextRequest, NextResponse } from "next/server";

// Configurar runtime para nodejs (necessário para pacotes que usam Node.js APIs)
export const runtime = "nodejs";
export const maxDuration = 30; // Aumentar timeout para 30 segundos na Vercel

const GENIUS_API_BASE = "https://api.genius.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Busca música no Genius e retorna a URL (método manual como fallback)
 */
async function searchSongManual(
  accessToken: string,
  artist: string,
  title: string
): Promise<string> {
  const url = `${GENIUS_API_BASE}/search?access_token=${accessToken}&q=${encodeURIComponent(
    `${artist} ${title}`
  )}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erro na busca: ${response.status}`);
  }

  const data = await response.json();
  const songUrl = data.response?.hits?.[0]?.result?.url;

  if (!songUrl) {
    throw new Error("Música não encontrada");
  }

  return songUrl;
}

/**
 * Extrai letra da página HTML do Genius (método manual como fallback)
 */
async function extractLyricsManual(songUrl: string): Promise<string> {
  const response = await fetch(songUrl, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar página: ${response.status}`);
  }

  const html = await response.text();

  // Busca a letra no HTML usando múltiplos padrões
  const lyricsMatch =
    html.match(
      /<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/i
    ) ||
    html.match(/<div[^>]*data-lyrics-container[^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div[^>]*class="lyrics"[^>]*>([\s\S]*?)<\/div>/i);

  if (!lyricsMatch) {
    throw new Error("Letra não encontrada no HTML");
  }

  // Limpa o HTML
  let lyrics = lyricsMatch[1]
    .replace(/<[^>]+>/g, "")
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

  if (lyrics.length < 50) {
    throw new Error("Letra muito curta");
  }

  return lyrics;
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

    console.log(`[Lyrics API] Buscando: ${musica} - ${artista}`);
    console.log(`[Lyrics API] API Key presente: ${!!apiKey}`);

    if (!apiKey) {
      console.error("[Lyrics API] GENIUS_API_KEY não configurada");
      return NextResponse.json(
        { error: "GENIUS_API_KEY não configurada" },
        { status: 500 }
      );
    }

    // Tentar usar o pacote genius-lyrics primeiro
    try {
      const { Client } = await import("genius-lyrics");
      const client = new Client(apiKey);
      const searchQuery = `${musica} ${artista}`;

      console.log(`[Lyrics API] Tentando com genius-lyrics: ${searchQuery}`);
      const searches = await client.songs.search(searchQuery);

      if (searches && searches.length > 0) {
        const song = searches[0];
        console.log(
          `[Lyrics API] Música encontrada: ${song.title} - ${song.artist.name}`
        );

        const lyrics = await song.lyrics();

        if (lyrics && lyrics.trim().length >= 50) {
          console.log(
            `[Lyrics API] Letra obtida com sucesso via genius-lyrics: ${
              lyrics.trim().length
            } caracteres`
          );
          return NextResponse.json({ lyrics: lyrics.trim() });
        }
      }

      console.warn(
        "[Lyrics API] genius-lyrics não retornou resultado válido, tentando método manual"
      );
    } catch (packageError: any) {
      console.warn(
        "[Lyrics API] Erro ao usar genius-lyrics, tentando método manual:",
        packageError?.message
      );
    }

    // Fallback para método manual
    console.log("[Lyrics API] Usando método manual (fallback)");
    const songUrl = await searchSongManual(apiKey, artista, musica);
    const lyrics = await extractLyricsManual(songUrl);

    console.log(
      `[Lyrics API] Letra obtida com sucesso via método manual: ${lyrics.length} caracteres`
    );
    return NextResponse.json({ lyrics });
  } catch (error: any) {
    console.error("[Lyrics API] Erro geral:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });

    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    const status =
      message.includes("403") ||
      message.includes("401") ||
      message.includes("Unauthorized")
        ? 403
        : message.includes("não encontrada") ||
          message.includes("não encontrado") ||
          message.includes("not found")
        ? 404
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
