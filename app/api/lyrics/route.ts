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
  console.log("[Genius API] URL da música encontrada:", songUrl);

  // Pular a biblioteca genius-lyrics-api completamente e fazer scraping manual direto
  // A biblioteca não envia User-Agent e causa erro 403
  console.log("[Genius API] Fazendo scraping manual direto (sem biblioteca)...");
  
  return await fetchLyricsManually(songUrl, userAgent);
}

/**
 * Faz scraping manual da página HTML do Genius com User-Agent
 * Extrai a letra diretamente do HTML sem usar bibliotecas
 */
async function fetchLyricsManually(songUrl: string, userAgent: string): Promise<string> {
  console.log("[Genius API] Fazendo scraping manual de:", songUrl);
  console.log("[Genius API] User-Agent:", userAgent);
  
  const response = await fetch(songUrl, {
    method: "GET",
    headers: {
      "User-Agent": userAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    },
  });

  console.log("[Genius API] Status da resposta do scraping:", response.status);
  console.log("[Genius API] Headers da resposta:", Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unable to read error response");
    console.error("[Genius API] Erro ao buscar página:", response.status, errorText.substring(0, 500));
    throw new Error(`Failed to fetch Genius page: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const html = await response.text();
  console.log("[Genius API] HTML recebido, tamanho:", html.length, "caracteres");
  
  // O Genius usa um padrão específico para a letra
  // Vamos tentar vários padrões comuns
  let lyrics = "";
  
  // Padrão 1: div com data-lyrics-container-id
  const pattern1 = /<div[^>]*data-lyrics-container[^>]*>([\s\S]*?)<\/div>/gi;
  let match1 = pattern1.exec(html);
  if (match1) {
    lyrics = match1[1];
    console.log("[Genius API] Letra encontrada com padrão 1 (data-lyrics-container)");
  }
  
  // Padrão 2: div com class contendo "lyrics"
  if (!lyrics || lyrics.length < 100) {
    const pattern2 = /<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const matches2 = html.match(pattern2);
    if (matches2 && matches2.length > 0) {
      // Pegar o maior match
      lyrics = matches2.reduce((prev, curr) => curr.length > prev.length ? curr : prev, "");
      console.log("[Genius API] Letra encontrada com padrão 2 (class lyrics)");
    }
  }
  
  // Padrão 3: div dentro de [data-lyrics-container="true"]
  if (!lyrics || lyrics.length < 100) {
    const pattern3 = /<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi;
    let match3 = pattern3.exec(html);
    if (match3) {
      lyrics = match3[1];
      console.log("[Genius API] Letra encontrada com padrão 3 (data-lyrics-container=true)");
    }
  }
  
  // Padrão 4: Buscar por todas as divs e pegar a maior que parece ser letra
  if (!lyrics || lyrics.length < 100) {
    const allDivs = html.match(/<div[^>]*>([\s\S]*?)<\/div>/gi);
    if (allDivs) {
      // Filtrar divs que parecem conter letras (muitas quebras de linha, texto longo)
      const lyricsDivs = allDivs
        .map(div => {
          const text = div.replace(/<[^>]+>/g, '').trim();
          const lineBreaks = (text.match(/\n/g) || []).length;
          return { div, text, lineBreaks, length: text.length };
        })
        .filter(item => item.lineBreaks > 10 && item.length > 500)
        .sort((a, b) => b.length - a.length);
      
      if (lyricsDivs.length > 0) {
        lyrics = lyricsDivs[0].div;
        console.log("[Genius API] Letra encontrada com padrão 4 (heurística)");
      }
    }
  }
  
  if (!lyrics || lyrics.length < 100) {
    console.error("[Genius API] Não foi possível encontrar a letra no HTML");
    console.error("[Genius API] Primeiros 2000 caracteres do HTML:", html.substring(0, 2000));
    throw new Error("Não foi possível extrair a letra do HTML do Genius. A estrutura da página pode ter mudado.");
  }
  
  // Limpar HTML e formatar a letra
  console.log("[Genius API] Letra bruta encontrada, tamanho:", lyrics.length);
  
  // Remover tags HTML mas preservar quebras de linha
  lyrics = lyrics
    .replace(/<br\s*\/?>/gi, '\n') // <br> vira quebra de linha
    .replace(/<\/p>/gi, '\n\n') // </p> vira quebra dupla
    .replace(/<\/div>/gi, '\n') // </div> vira quebra de linha
    .replace(/<[^>]+>/g, '') // Remove todas as outras tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n') // Remove múltiplas quebras de linha
    .trim();
  
  console.log("[Genius API] Letra limpa, tamanho final:", lyrics.length);
  
  if (lyrics.length < 50) {
    throw new Error("Letra extraída é muito curta, pode estar incorreta");
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
