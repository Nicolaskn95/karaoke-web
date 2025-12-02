import { type NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";
dotenv.config();

/**
 * Mascara a API key para logs (mostra apenas primeiros e últimos caracteres)
 */
function maskApiKey(apiKey: string | undefined): string {
  if (!apiKey) return "undefined";
  if (apiKey.length <= 8) return "***";
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Busca letra no Genius usando a API oficial diretamente
 * Inclui User-Agent para evitar bloqueio 403
 */
async function fetchGeniusLyrics(
  apiKey: string,
  artist: string,
  title: string
): Promise<string> {
  const GENIUS_API_BASE = "https://api.genius.com";
  
  // User-Agent no formato correto (não apenas URL)
  const userAgent = "KaraokeApp/1.0 (https://v0-karaoke-website-development.vercel.app)";
  
  // Primeiro, buscar a música na API do Genius
  const searchUrl = `${GENIUS_API_BASE}/search?q=${encodeURIComponent(`${artist} ${title}`)}`;
  
  console.log("[Genius API] Buscando música:", { artist, title });
  console.log("[Genius API] User-Agent configurado:", userAgent);
  console.log("[Genius API] URL da busca:", searchUrl);
  
  const searchResponse = await fetch(searchUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": userAgent, // IMPORTANTE: Evita bloqueio 403 do Genius
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  console.log("[Genius API] Status da resposta:", searchResponse.status);
  console.log("[Genius API] Headers da resposta:", Object.fromEntries(searchResponse.headers.entries()));

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    console.error("[Genius API] Erro na busca:", searchResponse.status, errorText);
    console.error("[Genius API] Headers enviados:", {
      Authorization: `Bearer ${maskApiKey(apiKey)}`,
      "User-Agent": userAgent,
    });
    
    // Se for 403 na busca, lançar erro específico
    if (searchResponse.status === 403) {
      throw new Error(`Genius API search 403 Forbidden - User-Agent pode não estar sendo aceito. Status: ${searchResponse.status}, Response: ${errorText}`);
    }
    
    throw new Error(`Genius API search failed: ${searchResponse.status} - ${errorText}`);
  }

  const searchData = await searchResponse.json();
  
  // Pegar o primeiro resultado (mais relevante)
  const hits = searchData.response?.hits;
  if (!hits || hits.length === 0) {
    throw new Error("Nenhuma música encontrada no Genius");
  }

  const songPath = hits[0].result?.path;
  if (!songPath) {
    throw new Error("Caminho da música não encontrado");
  }

  // Obter a URL completa da música no Genius
  const songUrl = `https://genius.com${songPath}`;
  console.log("[Genius API] URL da música:", songUrl);

  // Configurar User-Agent globalmente para requisições HTTP do Node.js
  // Isso pode ajudar algumas bibliotecas que usam fetch/axios
  if (typeof process !== 'undefined') {
    process.env.USER_AGENT = userAgent;
  }

  // @ts-ignore - genius-lyrics-api não tem tipos TypeScript
  const geniusLyricsApi = require("genius-lyrics-api");
  
  const options = {
    apiKey: apiKey,
    title: title,
    artist: artist,
    optimizeQuery: true,
  };

  console.log("[Genius API] Tentando buscar letra com genius-lyrics-api...");
  console.log("[Genius API] User-Agent configurado globalmente:", userAgent);

  try {
    // Tentar getSong primeiro
    console.log("[Genius API] Tentando getSong...");
    const songData = await geniusLyricsApi.getSong(options);
    if (songData && songData.lyrics) {
      console.log("[Genius API] Letra obtida com getSong");
      return songData.lyrics;
    }
  } catch (err: any) {
    console.error("[Genius API] getSong falhou:", err);
    console.error("[Genius API] Erro getSong - status:", err.status || err.response?.status);
    console.error("[Genius API] Erro getSong - message:", err.message);
    
    // Se for 403, tentar fazer scraping manual
    if (err.status === 403 || err.response?.status === 403 || err.message?.includes("403")) {
      console.error("[Genius API] ERRO 403 detectado - tentando scraping manual com User-Agent...");
      
      // Tentar fazer scraping manual da página HTML
      try {
        const lyrics = await fetchLyricsManually(songUrl, userAgent);
        if (lyrics) {
          console.log("[Genius API] Letra obtida com scraping manual");
          return lyrics;
        }
      } catch (manualErr) {
        console.error("[Genius API] Scraping manual também falhou:", manualErr);
        throw new Error("403 Forbidden - A biblioteca genius-lyrics-api não está enviando User-Agent e o scraping manual também falhou");
      }
    }
  }

  // Se não conseguiu, usar getLyrics
  try {
    console.log("[Genius API] Tentando getLyrics...");
    const lyrics = await geniusLyricsApi.getLyrics(options);
    console.log("[Genius API] Letra obtida com getLyrics");
    return lyrics;
  } catch (err: any) {
    console.error("[Genius API] getLyrics também falhou:", err);
    console.error("[Genius API] Erro getLyrics - status:", err.status || err.response?.status);
    
    // Se for 403, tentar scraping manual
    if (err.status === 403 || err.response?.status === 403 || err.message?.includes("403")) {
      console.error("[Genius API] ERRO 403 no getLyrics - tentando scraping manual...");
      try {
        const lyrics = await fetchLyricsManually(songUrl, userAgent);
        if (lyrics) {
          return lyrics;
        }
      } catch (manualErr) {
        console.error("[Genius API] Scraping manual falhou:", manualErr);
      }
    }
    
    throw err;
  }
}

/**
 * Faz scraping manual da página HTML do Genius com User-Agent
 */
async function fetchLyricsManually(songUrl: string, userAgent: string): Promise<string> {
  console.log("[Genius API] Fazendo scraping manual de:", songUrl);
  
  const response = await fetch(songUrl, {
    method: "GET",
    headers: {
      "User-Agent": userAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Genius page: ${response.status}`);
  }

  const html = await response.text();
  
  // Extrair a letra do HTML (simplificado - pode precisar de ajustes)
  // A biblioteca genius-lyrics-api faz isso melhor, mas vamos tentar uma extração básica
  const lyricsMatch = html.match(/<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  
  if (lyricsMatch && lyricsMatch[1]) {
    // Limpar HTML básico
    let lyrics = lyricsMatch[1]
      .replace(/<[^>]+>/g, '') // Remove tags HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    if (lyrics.length > 100) { // Se encontrou algo substancial
      return lyrics;
    }
  }
  
  throw new Error("Não foi possível extrair a letra do HTML");
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

    const GENIUS_API_KEY = process.env.GENIUS_API_KEY;

    // Log da API key mascarada para debug
    console.log("[Lyrics API] Ambiente:", process.env.NODE_ENV);
    console.log("[Lyrics API] API Key carregada:", GENIUS_API_KEY ? "SIM" : "NÃO");
    console.log("[Lyrics API] API Key (mascarada):", maskApiKey(GENIUS_API_KEY));
    console.log("[Lyrics API] Tamanho da API Key:", GENIUS_API_KEY?.length || 0);

    if (!GENIUS_API_KEY) {
      console.error("GENIUS_API_KEY não encontrada nas variáveis de ambiente");
      console.error(
        "Variáveis de ambiente disponíveis:",
        Object.keys(process.env).filter(
          (key) => key.includes("GENIUS") || key.includes("API")
        )
      );

      return NextResponse.json(
        {
          error: "Genius API key não configurada",
          hint:
            process.env.NODE_ENV === "production"
              ? "Configure GENIUS_API_KEY nas variáveis de ambiente da plataforma de deploy (Vercel, Netlify, etc.)"
              : "Configure GENIUS_API_KEY no arquivo .env.local",
          debug: {
            environment: process.env.NODE_ENV,
            apiKeyFound: false,
            apiKeyLength: 0,
            availableEnvVars: Object.keys(process.env).filter(
              (key) => key.includes("GENIUS") || key.includes("API")
            ),
          },
        },
        { status: 500 }
      );
    }

    // Buscar letra usando a API oficial do Genius diretamente
    // Isso nos permite adicionar o User-Agent necessário para evitar bloqueio 403
    try {
      const lyrics = await fetchGeniusLyrics(GENIUS_API_KEY, artista, musica);

      if (!lyrics || lyrics.trim().length === 0) {
        return NextResponse.json(
          { error: "Letra não encontrada no Genius" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        lyrics,
      });
    } catch (error: any) {
      // Log detalhado do erro
      console.error("Erro ao buscar letra no Genius:", error);
      console.error("Status code:", error.status || error.response?.status);
      console.error("Error details:", error.response?.data || error.message);
      console.error("[Lyrics API] API Key usada (mascarada):", maskApiKey(GENIUS_API_KEY));
      console.error("[Lyrics API] Tamanho da API Key:", GENIUS_API_KEY?.length || 0);
      console.error("[Lyrics API] Ambiente:", process.env.NODE_ENV);

      // Tratamento de erros específicos da API do Genius
      // AxiosError tem status em error.status ou error.response.status
      const statusCode = error.status || error.response?.status;
      const errorCode = error.code;

      // Detecta erro 403 (Forbidden) - geralmente por falta de User-Agent
      if (
        statusCode === 403 ||
        error.message?.includes("403") ||
        error.message?.includes("Forbidden")
      ) {
        console.error("========================================");
        console.error("[FORBIDDEN] Erro 403 detectado!");
        console.error("[FORBIDDEN] Possível causa: User-Agent não configurado");
        console.error("[FORBIDDEN] API Key usada (mascarada):", maskApiKey(GENIUS_API_KEY));
        console.error("========================================");

        return NextResponse.json(
          {
            error: "Acesso negado pela API do Genius (403 Forbidden)",
            hint: "A API do Genius bloqueia requisições sem User-Agent. Verifique se o User-Agent está sendo enviado corretamente.",
            debug: {
              apiKeyMasked: maskApiKey(GENIUS_API_KEY),
              apiKeyLength: GENIUS_API_KEY?.length || 0,
              environment: process.env.NODE_ENV,
              statusCode: statusCode,
              errorMessage: error.message,
            },
          },
          { status: 403 }
        );
      }

      // Detecta erro 401 (Unauthorized)
      if (
        statusCode === 401 ||
        errorCode === "ERR_BAD_REQUEST" ||
        error.message?.includes("401") ||
        error.message?.includes("Unauthorized")
      ) {
        // Log específico para unauthorized
        console.error("========================================");
        console.error("[UNAUTHORIZED] Erro 401 detectado!");
        console.error("[UNAUTHORIZED] API Key usada (mascarada):", maskApiKey(GENIUS_API_KEY));
        console.error("[UNAUTHORIZED] Tamanho da API Key:", GENIUS_API_KEY?.length || 0);
        console.error("[UNAUTHORIZED] Ambiente:", process.env.NODE_ENV);
        console.error("[UNAUTHORIZED] Primeiros 10 chars:", GENIUS_API_KEY?.substring(0, 10));
        console.error("[UNAUTHORIZED] Últimos 10 chars:", GENIUS_API_KEY?.substring(GENIUS_API_KEY.length - 10));
        console.error("[UNAUTHORIZED] Erro completo:", JSON.stringify(error, null, 2));
        console.error("========================================");

        return NextResponse.json(
          {
            error: "Token de acesso do Genius inválido ou expirado",
            hint: "Verifique se o token está correto em https://genius.com/api-clients e se não expirou",
            debug: {
              apiKeyMasked: maskApiKey(GENIUS_API_KEY),
              apiKeyLength: GENIUS_API_KEY?.length || 0,
              environment: process.env.NODE_ENV,
              apiKeyFirstChars: GENIUS_API_KEY?.substring(0, 10) || "N/A",
              apiKeyLastChars: GENIUS_API_KEY?.substring(GENIUS_API_KEY.length - 10) || "N/A",
              statusCode: statusCode,
              errorCode: errorCode,
              errorMessage: error.message,
            },
          },
          { status: 401 }
        );
      }

      if (statusCode === 429 || statusCode === "429") {
        return NextResponse.json(
          {
            error:
              "Limite de requisições excedido. Tente novamente mais tarde.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Erro ao buscar letra no Genius",
          debug: {
            message: error.message,
            status: statusCode,
            errorCode: errorCode,
            apiKeyMasked: maskApiKey(GENIUS_API_KEY),
            apiKeyLength: GENIUS_API_KEY?.length || 0,
            environment: process.env.NODE_ENV,
            response: error.response?.data,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erro na API de letras:", error);
    console.error("[Lyrics API] API Key (mascarada):", maskApiKey(process.env.GENIUS_API_KEY));
    console.error("[Lyrics API] Ambiente:", process.env.NODE_ENV);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        debug: {
          message: error instanceof Error ? error.message : "Unknown error",
          apiKeyMasked: maskApiKey(process.env.GENIUS_API_KEY),
          apiKeyLength: process.env.GENIUS_API_KEY?.length || 0,
          environment: process.env.NODE_ENV,
        },
      },
      { status: 500 }
    );
  }
}
