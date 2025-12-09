import { type NextRequest, NextResponse } from "next/server";

const GENIUS_API_BASE = "https://api.genius.com";
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Busca música no Genius e retorna a URL
 */
async function searchSong(accessToken: string, artist: string, title: string): Promise<string> {
  const url = `${GENIUS_API_BASE}/search?access_token=${accessToken}&q=${encodeURIComponent(`${artist} ${title}`)}`;
  
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
 * Extrai letra da página HTML do Genius
 */
async function extractLyrics(songUrl: string): Promise<string> {
  const response = await fetch(songUrl, {
    headers: { "User-Agent": USER_AGENT },
  });
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar página: ${response.status}`);
  }
  
  const html = await response.text();
  
  // Busca a letra no HTML usando regex simples
  const lyricsMatch = html.match(/<div[^>]*data-lyrics-container[^>]*>([\s\S]*?)<\/div>/i) ||
                     html.match(/<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  
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

    if (!apiKey) {
      console.error("GENIUS_API_KEY não configurada");
      return NextResponse.json(
        { error: "GENIUS_API_KEY não configurada" },
        { status: 500 }
      );
    }

    const songUrl = await searchSong(apiKey, artista, musica);
    const lyrics = await extractLyrics(songUrl);

    return NextResponse.json({ lyrics });
  } catch (error) {
    console.error("Erro:", error);
    
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const status = message.includes("403") ? 403 : 
                   message.includes("401") ? 401 : 
                   message.includes("não encontrada") ? 404 : 500;
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
