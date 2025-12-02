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
  
  // Primeiro, buscar a música na API do Genius
  const searchUrl = `${GENIUS_API_BASE}/search?q=${encodeURIComponent(`${artist} ${title}`)}`;
  
  const userAgent = "https://v0-karaoke-website-development.vercel.app";
  
  console.log("[Genius API] Buscando música:", { artist, title });
  console.log("[Genius API] User-Agent configurado:", userAgent);
  
  const searchResponse = await fetch(searchUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": userAgent, // IMPORTANTE: Evita bloqueio 403 do Genius
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    console.error("[Genius API] Erro na busca:", searchResponse.status, errorText);
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

  // Agora buscar a letra usando a biblioteca genius-lyrics-api
  // (ela faz o scraping da página HTML)
  // @ts-ignore - genius-lyrics-api não tem tipos TypeScript
  const geniusLyricsApi = require("genius-lyrics-api");
  
  const options = {
    apiKey: apiKey,
    title: title,
    artist: artist,
    optimizeQuery: true,
  };

  try {
    // Tentar getSong primeiro
    const songData = await geniusLyricsApi.getSong(options);
    if (songData && songData.lyrics) {
      return songData.lyrics;
    }
  } catch (err) {
    console.log("[Genius API] getSong falhou, tentando getLyrics:", err);
  }

  // Se não conseguiu, usar getLyrics
  const lyrics = await geniusLyricsApi.getLyrics(options);
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
