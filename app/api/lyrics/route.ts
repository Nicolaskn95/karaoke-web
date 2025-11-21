import { type NextRequest, NextResponse } from "next/server";

// @ts-ignore - genius-lyrics-api não tem tipos TypeScript
const geniusLyricsApi = require("genius-lyrics-api");

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
        },
        { status: 500 }
      );
    }

    // Configuração conforme documentação do Genius API
    // https://docs.genius.com/#/getting-started-h1
    const options = {
      apiKey: GENIUS_API_KEY, // Access Token obtido em https://genius.com/api-clients
      title: musica,
      artist: artista,
      optimizeQuery: true, // Limpa o título (remove "feat.", "Live", etc) para melhorar a busca
    };

    try {
      // Usar getSong para obter dados completos incluindo URL da página
      let songData: any = null;
      let lyrics = "";

      // Primeiro tentar getSong que retorna mais informações
      try {
        songData = await geniusLyricsApi.getSong(options);
        if (songData && songData.lyrics) {
          lyrics = songData.lyrics;
        }
      } catch (err) {
        console.log("getSong falhou, tentando getLyrics:", err);
      }

      // Se não conseguiu com getSong, usar getLyrics
      if (!lyrics) {
        lyrics = await geniusLyricsApi.getLyrics(options);
      }

      if (!lyrics || lyrics.trim().length === 0) {
        return NextResponse.json(
          { error: "Letra não encontrada no Genius" },
          { status: 404 }
        );
      }

      // Extrair links de mídia da página do Genius se tiver URL
      const mediaLinks: Array<{ provider: string; url: string }> = [];

      if (songData && songData.url) {
        try {
          // Fazer scraping da página do Genius para obter media
          const pageResponse = await fetch(songData.url);
          if (pageResponse.ok) {
            const pageHtml = await pageResponse.text();

            // Procurar por JSON-LD ou dados estruturados com media
            const jsonLdMatch = pageHtml.match(
              /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/
            );
            if (jsonLdMatch) {
              try {
                const jsonData = JSON.parse(jsonLdMatch[1]);
                if (jsonData.audio && Array.isArray(jsonData.audio)) {
                  jsonData.audio.forEach((audio: any) => {
                    if (audio.contentUrl) {
                      mediaLinks.push({
                        provider: "audio",
                        url: audio.contentUrl,
                      });
                    }
                  });
                }
              } catch (e) {
                // Ignorar erro de parsing
              }
            }

            // Procurar por iframes do YouTube na página
            const youtubeMatches = pageHtml.match(
              /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g
            );
            if (youtubeMatches) {
              youtubeMatches.forEach((match) => {
                const videoId = match.match(/\/([a-zA-Z0-9_-]{11})/)?.[1];
                if (videoId) {
                  mediaLinks.push({
                    provider: "youtube",
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                  });
                }
              });
            }

            // Procurar por links de YouTube
            const youtubeLinkMatches = pageHtml.match(
              /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g
            );
            if (youtubeLinkMatches) {
              youtubeLinkMatches.forEach((url) => {
                mediaLinks.push({
                  provider: "youtube",
                  url: url,
                });
              });
            }
          }
        } catch (err) {
          console.error("Erro ao buscar media da página:", err);
        }
      }

      return NextResponse.json({
        lyrics,
        media: mediaLinks.length > 0 ? mediaLinks : undefined,
      });
    } catch (error: any) {
      console.error("Erro ao buscar letra no Genius:", error);
      console.error("Status code:", error.status || error.response?.status);
      console.error("Error details:", error.response?.data || error.message);

      // Tratamento de erros específicos da API do Genius
      // AxiosError tem status em error.status ou error.response.status
      const statusCode = error.status || error.response?.status;
      const errorCode = error.code;

      // Detecta erro 401 (Unauthorized)
      if (
        statusCode === 401 ||
        errorCode === "ERR_BAD_REQUEST" ||
        error.message?.includes("401") ||
        error.message?.includes("Unauthorized")
      ) {
        return NextResponse.json(
          {
            error: "Token de acesso do Genius inválido ou expirado",
            hint: "Verifique se o token está correto em https://genius.com/api-clients e se não expirou",
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
          details:
            process.env.NODE_ENV === "development"
              ? {
                  message: error.message,
                  status: statusCode,
                  response: error.response?.data,
                }
              : undefined,
        },
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
