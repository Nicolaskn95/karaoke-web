import { type NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";
dotenv.config();

// Constantes
const GENIUS_API_BASE = "https://api.genius.com";
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MIN_LYRICS_LENGTH = 50;

/**
 * Mascara a API key para logs
 */
function maskApiKey(apiKey: string | undefined): string {
  if (!apiKey) return "undefined";
  if (apiKey.length <= 8) return "***";
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Busca música na API do Genius
 */
async function searchGeniusSong(accessToken: string, artist: string, title: string): Promise<string> {
  const query = `${artist} ${title}`;
  const url = `${GENIUS_API_BASE}/search?access_token=${accessToken}&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 403) {
      throw new Error(`403 Forbidden - Verifique se está usando ACCESS TOKEN correto: ${errorText}`);
    }
    throw new Error(`Genius API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const hits = data.response?.hits;

  if (!hits || hits.length === 0) {
    throw new Error("Nenhuma música encontrada no Genius");
  }

  const songUrl = hits[0].result?.url;
  if (!songUrl) {
    throw new Error("URL da música não encontrada");
  }

  return songUrl;
}

/**
 * Extrai letra do HTML usando múltiplos padrões
 */
function extractLyricsFromHTML(html: string): string | null {
  const patterns = [
    /<div[^>]*data-lyrics-container[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match && match[1] && match[1].length > 100) {
      return match[1];
    }
  }

  // Fallback: buscar maior div com muitas quebras de linha
  const allDivs = html.match(/<div[^>]*>([\s\S]*?)<\/div>/gi);
  if (allDivs) {
    const lyricsDivs = allDivs
      .map((div) => {
        const text = div.replace(/<[^>]+>/g, "").trim();
        const lineBreaks = (text.match(/\n/g) || []).length;
        return { div, length: text.length, lineBreaks };
      })
      .filter((item) => item.lineBreaks > 10 && item.length > 500)
      .sort((a, b) => b.length - a.length);

    if (lyricsDivs.length > 0) {
      return lyricsDivs[0].div;
    }
  }

  return null;
}

/**
 * Limpa e formata a letra extraída do HTML
 */
function cleanLyrics(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Faz scraping da página HTML do Genius para extrair a letra
 */
async function fetchLyricsFromPage(songUrl: string): Promise<string> {
  const response = await fetch(songUrl, {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Genius page: ${response.status}`);
  }

  const html = await response.text();
  const rawLyrics = extractLyricsFromHTML(html);

  if (!rawLyrics || rawLyrics.length < 100) {
    throw new Error("Não foi possível extrair a letra do HTML do Genius");
  }

  const lyrics = cleanLyrics(rawLyrics);

  if (lyrics.length < MIN_LYRICS_LENGTH) {
    throw new Error("Letra extraída é muito curta");
  }

  return lyrics;
}

/**
 * Busca letra completa no Genius
 */
async function fetchGeniusLyrics(
  accessToken: string,
  artist: string,
  title: string
): Promise<string> {
  const songUrl = await searchGeniusSong(accessToken, artist, title);
  return await fetchLyricsFromPage(songUrl);
}

/**
 * Cria resposta de erro padronizada
 */
function createErrorResponse(
  error: any,
  apiKey: string | undefined,
  defaultStatus: number = 500
) {
  const statusCode = error.status || error.response?.status || defaultStatus;
  const errorMessage = error.message || "Unknown error";

  const debug = {
    apiKeyMasked: maskApiKey(apiKey),
    apiKeyLength: apiKey?.length || 0,
    environment: process.env.NODE_ENV,
    statusCode,
    errorMessage,
  };

  // Erros específicos
  if (statusCode === 403 || errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
    return NextResponse.json(
      {
        error: "Acesso negado pela API do Genius (403 Forbidden)",
        hint: "Verifique se está usando ACCESS TOKEN (não CLIENT SECRET) em https://genius.com/api-clients",
        debug: {
          ...debug,
          apiKeyFirstChars: apiKey?.substring(0, 10),
          apiKeyLastChars: apiKey?.substring(apiKey.length - 10),
        },
      },
      { status: 403 }
    );
  }

  if (statusCode === 401 || errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
    return NextResponse.json(
      {
        error: "Token de acesso do Genius inválido ou expirado",
        hint: "Verifique se o token está correto em https://genius.com/api-clients",
        debug: {
          ...debug,
          apiKeyFirstChars: apiKey?.substring(0, 10) || "N/A",
          apiKeyLastChars: apiKey?.substring(apiKey.length - 10) || "N/A",
        },
      },
      { status: 401 }
    );
  }

  if (statusCode === 429) {
    return NextResponse.json(
      {
        error: "Limite de requisições excedido. Tente novamente mais tarde.",
      },
      { status: 429 }
    );
  }

  return NextResponse.json(
    {
      error: "Erro ao buscar letra no Genius",
      debug: process.env.NODE_ENV === "development" ? debug : undefined,
    },
    { status: defaultStatus }
  );
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

    const accessToken = process.env.GENIUS_API_KEY;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Genius API key não configurada",
          hint:
            process.env.NODE_ENV === "production"
              ? "Configure GENIUS_API_KEY nas variáveis de ambiente"
              : "Configure GENIUS_API_KEY no arquivo .env.local",
        },
        { status: 500 }
      );
    }

    try {
      const lyrics = await fetchGeniusLyrics(accessToken, artista, musica);

      if (!lyrics || lyrics.trim().length === 0) {
        return NextResponse.json(
          { error: "Letra não encontrada no Genius" },
          { status: 404 }
        );
      }

      return NextResponse.json({ lyrics });
    } catch (error) {
      console.error("[Lyrics API] Erro:", error);
      return createErrorResponse(error, accessToken);
    }
  } catch (error) {
    console.error("[Lyrics API] Erro interno:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        debug: process.env.NODE_ENV === "development" ? {
          message: error instanceof Error ? error.message : "Unknown error",
        } : undefined,
      },
      { status: 500 }
    );
  }
}
