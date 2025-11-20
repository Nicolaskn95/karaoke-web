import { type NextRequest, NextResponse } from "next/server";

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

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    const searchQuery = `${artista} ${musica} official`;

    // Se tiver API key do YouTube, usar a API oficial
    if (YOUTUBE_API_KEY) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            return NextResponse.json({
              videoId: data.items[0].id.videoId,
              title: data.items[0].snippet.title,
            });
          }
        }
      } catch (err) {
        console.error("Erro ao buscar na YouTube API:", err);
      }
    }

    // Fallback: tentar buscar via scraping ou retornar null
    // Por enquanto, retornar null para que o frontend não tente exibir link
    return NextResponse.json({
      videoId: null,
      searchQuery: searchQuery,
    });
  } catch (error) {
    console.error("Erro ao buscar vídeo do YouTube:", error);
    return NextResponse.json(
      { error: "Erro ao buscar vídeo" },
      { status: 500 }
    );
  }
}

