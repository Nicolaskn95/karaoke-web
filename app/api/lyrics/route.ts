import { type NextRequest, NextResponse } from "next/server";
import { Client } from "genius-lyrics";

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

    // O pacote genius-lyrics pode funcionar sem API key, mas funciona melhor com uma
    const client = apiKey ? new Client(apiKey) : new Client();

    try {
      // Busca a música
      const searches = await client.songs.search(`${musica} ${artista}`);

      if (!searches || searches.length === 0) {
        return NextResponse.json(
          { error: "Música não encontrada" },
          { status: 404 }
        );
      }

      // Pega a primeira música encontrada
      const song = searches[0];
      
      // Obtém a letra
      const lyrics = await song.lyrics();

      if (!lyrics || lyrics.trim().length < 50) {
        return NextResponse.json(
          { error: "Letra não encontrada ou muito curta" },
          { status: 404 }
        );
      }

      return NextResponse.json({ lyrics: lyrics.trim() });
    } catch (clientError) {
      console.error("Erro ao buscar letra com genius-lyrics:", clientError);
      throw clientError;
    }
  } catch (error) {
    console.error("Erro:", error);
    
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const status = message.includes("403") || message.includes("401") ? 403 : 
                   message.includes("não encontrada") || message.includes("não encontrado") ? 404 : 500;
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
