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
  const [geniusLyrics, setGeniusLyrics] = useState<string>("");
  const [lrclibLyrics, setLrclibLyrics] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<
    "genius" | "lrclib" | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingGenius, setIsLoadingGenius] = useState(false);
  const [isLoadingLrclib, setIsLoadingLrclib] = useState(false);
  const t = translations[language];

  // Lyrics atuais baseado na fonte selecionada
  const lyrics =
    selectedSource === "genius"
      ? geniusLyrics
      : selectedSource === "lrclib"
      ? lrclibLyrics
      : "";

  useEffect(() => {
    if (!isOpen) return;

    // Reset states
    setGeniusLyrics("");
    setLrclibLyrics("");
    setSelectedSource(null);
    setError(null);

    // Buscar ambas as fontes simultaneamente
    const fetchAllLyrics = async () => {
      setIsLoading(true);
      setIsLoadingGenius(true);
      setIsLoadingLrclib(true);

      // Buscar Genius
      const fetchGenius = async () => {
        try {
          const geniusResponse = await fetch(
            `/api/lyrics?artista=${encodeURIComponent(
              music.artista
            )}&musica=${encodeURIComponent(music.musica)}`
          );

          if (geniusResponse.ok) {
            const data = await geniusResponse.json();
            if (data.lyrics) {
              setGeniusLyrics(data.lyrics);
            }
          }
        } catch (err) {
          console.log("Erro ao buscar no Genius:", err);
        } finally {
          setIsLoadingGenius(false);
        }
      };

      // Buscar LRCLIB
      const fetchLrclib = async () => {
        try {
          const lrclibResponse = await fetch(
            `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
              music.artista
            )}&track_name=${encodeURIComponent(music.musica)}`
          );

          if (lrclibResponse.ok) {
            const data = await lrclibResponse.json();
            if (data.plainLyrics) {
              setLrclibLyrics(data.plainLyrics);
            }
          }
        } catch (err) {
          console.log("Erro ao buscar no LRCLIB:", err);
        } finally {
          setIsLoadingLrclib(false);
        }
      };

      // Buscar ambas simultaneamente
      await Promise.all([fetchGenius(), fetchLrclib()]);

      setIsLoading(false);
    };

    fetchAllLyrics();
  }, [isOpen, music, language, t]);

  // Selecionar automaticamente a primeira fonte encontrada
  useEffect(() => {
    if (!selectedSource) {
      if (geniusLyrics) {
        setSelectedSource("genius");
      } else if (lrclibLyrics) {
        setSelectedSource("lrclib");
      } else if (
        !isLoading &&
        !isLoadingGenius &&
        !isLoadingLrclib &&
        !geniusLyrics &&
        !lrclibLyrics
      ) {
        setError(t.lyricsNotFound);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    geniusLyrics,
    lrclibLyrics,
    selectedSource,
    isLoading,
    isLoadingGenius,
    isLoadingLrclib,
  ]);

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
            {isLoading && !geniusLyrics && !lrclibLyrics ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full border-3 border-accent/20 border-t-accent animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm md:text-base">
                    {t.loadingLyrics}
                  </p>
                </div>
              </div>
            ) : error && !geniusLyrics && !lrclibLyrics ? (
              <div className="text-center text-gray-600">
                <p className="text-lg mb-2">⚠️</p>
                <p className="text-sm md:text-base">{error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Seleção de fonte - Mostrar se tiver ambas ou pelo menos uma */}
                {(geniusLyrics || lrclibLyrics) && (
                  <div className="flex gap-2 mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200/50">
                    <p className="text-xs text-gray-600 mr-2 flex items-center">
                      {t.selectSource}:
                    </p>
                    <button
                      onClick={() => {
                        setSelectedSource("genius");
                      }}
                      disabled={!geniusLyrics || isLoadingGenius}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        selectedSource === "genius"
                          ? "bg-primary text-white"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                      } ${
                        !geniusLyrics ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isLoadingGenius ? "..." : `🎵 ${t.genius}`}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSource("lrclib");
                      }}
                      disabled={!lrclibLyrics || isLoadingLrclib}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        selectedSource === "lrclib"
                          ? "bg-primary text-white"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                      } ${
                        !lrclibLyrics ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isLoadingLrclib ? "..." : `📝 ${t.lrclib}`}
                    </button>
                  </div>
                )}

                {/* Fonte da letra */}
                {selectedSource && (
                  <div className="text-xs text-gray-500 mb-2 pb-2 border-b border-gray-200/50">
                    {selectedSource === "lrclib"
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
