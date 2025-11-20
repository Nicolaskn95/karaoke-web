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

    // Configuração conforme documentação do Genius API
    // https://docs.genius.com/#/getting-started-h1
    const options = {
      apiKey: GENIUS_API_KEY, // Access Token obtido em https://genius.com/api-clients
      title: musica,
      artist: artista,
      optimizeQuery: true, // Limpa o título (remove "feat.", "Live", etc) para melhorar a busca
    };

    try {
      const lyrics = await getLyrics(options);

      if (!lyrics || lyrics.trim().length === 0) {
        return NextResponse.json(
          { error: "Letra não encontrada no Genius" },
          { status: 404 }
        );
      }

      return NextResponse.json({ lyrics });
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
