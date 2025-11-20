"use client";

import { useState, useEffect } from "react";
import type { Music } from "@/app/page";
import type { Language } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  music: Music;
  language: Language;
}

export default function LyricsModal({
  isOpen,
  onClose,
  music,
  language,
}: LyricsModalProps) {
  const [lyrics, setLyrics] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [lyricsSource, setLyricsSource] = useState<"lrclib" | "genius" | null>(
    null
  );
  const [mediaLinks, setMediaLinks] = useState<
    Array<{ provider: string; url: string }>
  >([]);
  const t = translations[language];

  useEffect(() => {
    if (!isOpen) return;

    const fetchLyrics = async () => {
      setIsLoading(true);
      setError(null);

      // Primeiro, tenta buscar no Genius
      try {
        const geniusResponse = await fetch(
          `/api/lyrics?artista=${encodeURIComponent(
            music.artista
          )}&musica=${encodeURIComponent(music.musica)}`
        );

        if (geniusResponse.ok) {
          const data = await geniusResponse.json();
          if (data.lyrics) {
            setLyrics(data.lyrics);
            setLyricsSource("genius");

            // Se tiver links de mídia do Genius, usar eles
            if (
              data.media &&
              Array.isArray(data.media) &&
              data.media.length > 0
            ) {
              setMediaLinks(data.media);

              // Procurar link do YouTube nos media
              const youtubeLink = data.media.find(
                (m: { provider: string; url: string }) =>
                  m.provider.toLowerCase() === "youtube" ||
                  m.url.includes("youtube.com") ||
                  m.url.includes("youtu.be")
              );

              if (youtubeLink) {
                // Extrair videoId da URL do YouTube
                const videoIdMatch = youtubeLink.url.match(
                  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
                );

                if (videoIdMatch && videoIdMatch[1]) {
                  // VideoId válido encontrado
                  setYoutubeVideoId(videoIdMatch[1]);
                } else {
                  // Tentar extrair de outros formatos
                  const altMatch = youtubeLink.url.match(/([a-zA-Z0-9_-]{11})/);
                  if (altMatch && altMatch[1]) {
                    setYoutubeVideoId(altMatch[1]);
                  } else {
                    // Usar URL direta e converter para embed
                    setYoutubeUrl(youtubeLink.url);
                  }
                }
              } else {
                // Se não encontrou YouTube nos media, buscar manualmente
                await fetchYouTubeVideo(music.artista, music.musica);
              }
            } else {
              // Se não tiver media, buscar manualmente
              await fetchYouTubeVideo(music.artista, music.musica);
            }
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.log("Genius não encontrou a letra, tentando LRCLIB...");
      }

      // Se não encontrou no Genius, tenta no LRCLIB
      try {
        const lrclibResponse = await fetch(
          `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
            music.artista
          )}&track_name=${encodeURIComponent(music.musica)}`
        );

        if (lrclibResponse.ok) {
          const data = await lrclibResponse.json();
          if (data.plainLyrics) {
            setLyrics(data.plainLyrics);
            setLyricsSource("lrclib");
            await fetchYouTubeVideo(music.artista, music.musica);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.log("LRCLIB também não encontrou a letra");
      }

      // Se nenhum dos dois encontrou
      setError(t.lyricsNotFound);
      setLyrics(t.lyricsNotAvailable);
      setIsLoading(false);
    };

    fetchLyrics();
  }, [isOpen, music, language, t]);

  // Função para buscar vídeo do YouTube
  const fetchYouTubeVideo = async (artista: string, musica: string) => {
    try {
      // Buscar via API route
      const response = await fetch(
        `/api/youtube?artista=${encodeURIComponent(
          artista
        )}&musica=${encodeURIComponent(musica)}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.videoId && data.videoId.length === 11) {
          // VideoId válido encontrado
          setYoutubeVideoId(data.videoId);
        } else {
          // Tentar extrair videoId de uma URL se disponível
          // Ou usar busca inteligente que retorna o primeiro resultado
          const searchQuery = `${artista} ${musica} official`;
          // Usar o iframe de busca do YouTube que mostra resultados
          // Mas melhor ainda: tentar buscar o primeiro resultado via API
          setYoutubeVideoId(null); // Não definir se não tiver videoId válido
        }
      }
    } catch (err) {
      console.error("Erro ao buscar vídeo do YouTube:", err);
      setYoutubeVideoId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4">
        <div className="w-full max-w-2xl h-[90vh] md:h-auto md:max-h-[80vh] bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col animate-in fade-in scale-95 duration-200 shadow-2xl border border-gray-200/50">
          <div className="flex items-start justify-between p-4 md:p-6 border-b border-gray-200/50 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 break-words">
                {music.musica}
              </h2>
              <p className="text-xs md:text-sm text-gray-600 break-words mt-1">
                {music.artista}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-2 flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 text-gray-600 hover:text-gray-800"
              aria-label="Close"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full border-3 border-accent/20 border-t-accent animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm md:text-base">
                    {t.loadingLyrics}
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center text-gray-600">
                <p className="text-lg mb-2">⚠️</p>
                <p className="text-sm md:text-base">{error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* YouTube Video - Mostrar apenas se tiver letra do Genius ou LRCLIB */}
                {lyricsSource && (youtubeVideoId || youtubeUrl) && (
                  <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-100 mb-4 border border-gray-200/50 shadow-sm">
                    {youtubeVideoId && youtubeVideoId.length === 11 ? (
                      // Se for um videoId válido (11 caracteres), usar embed direto
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1`}
                        title={`${music.musica} - ${music.artista}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : youtubeUrl ? (
                      // Se tiver URL direta do YouTube, converter para embed
                      <iframe
                        width="100%"
                        height="100%"
                        src={(() => {
                          // Converter diferentes formatos de URL do YouTube para embed
                          let embedUrl = youtubeUrl;
                          // youtube.com/watch?v=VIDEO_ID -> embed/VIDEO_ID
                          embedUrl = embedUrl.replace(
                            /youtube\.com\/watch\?v=([^&]+)/,
                            "youtube.com/embed/$1"
                          );
                          // youtu.be/VIDEO_ID -> youtube.com/embed/VIDEO_ID
                          embedUrl = embedUrl.replace(
                            /youtu\.be\/([^?]+)/,
                            "youtube.com/embed/$1"
                          );
                          // youtube.com/embed/ já está correto
                          if (!embedUrl.includes("embed")) {
                            // Se ainda não for embed, tentar extrair videoId
                            const videoIdMatch = embedUrl.match(
                              /(?:v=|\/)([a-zA-Z0-9_-]{11})/
                            );
                            if (videoIdMatch) {
                              embedUrl = `https://www.youtube.com/embed/${videoIdMatch[1]}`;
                            }
                          }
                          // Garantir que seja HTTPS
                          if (!embedUrl.startsWith("http")) {
                            embedUrl = `https://${embedUrl}`;
                          }
                          return (
                            embedUrl +
                            (embedUrl.includes("?") ? "&" : "?") +
                            "rel=0&modestbranding=1"
                          );
                        })()}
                        title={`${music.musica} - ${music.artista}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : null}
                  </div>
                )}

                {/* Outros links de mídia do Genius */}
                {lyricsSource === "genius" && mediaLinks.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50/80 rounded-lg border border-gray-200/50">
                    <p className="text-xs text-gray-600 mb-2">Outros links:</p>
                    <div className="flex flex-wrap gap-2">
                      {mediaLinks
                        .filter(
                          (link) =>
                            link.provider.toLowerCase() !== "youtube" &&
                            !link.url.includes("youtube.com") &&
                            !link.url.includes("youtu.be")
                        )
                        .map((link, index) => (
                          <a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary rounded border border-primary/30 transition-colors"
                          >
                            {link.provider}
                          </a>
                        ))}
                    </div>
                  </div>
                )}

                {/* Fonte da letra */}
                {lyricsSource && (
                  <div className="text-xs text-gray-500 mb-2 pb-2 border-b border-gray-200/50">
                    {lyricsSource === "lrclib"
                      ? "📝 Fonte: LRCLIB"
                      : "🎵 Fonte: Genius"}
                  </div>
                )}

                {/* Letra da música - texto mais claro */}
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans text-sm md:text-base break-words bg-gray-50/80 p-4 rounded-lg border border-gray-200/50">
                  {lyrics}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 p-4 md:p-6 border-t border-gray-200/50">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-200 font-medium text-sm"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
