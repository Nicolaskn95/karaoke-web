"use client"

import { useState, useEffect } from "react"
import type { Music } from "@/app/page"
import type { Language } from "@/lib/i18n"
import { translations } from "@/lib/i18n"

interface LyricsModalProps {
  isOpen: boolean
  onClose: () => void
  music: Music
  language: Language
}

export default function LyricsModal({ isOpen, onClose, music, language }: LyricsModalProps) {
  const [lyrics, setLyrics] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = translations[language]

  useEffect(() => {
    if (!isOpen) return

    const fetchLyrics = async () => {
      setIsLoading(true)
      setError(null)
      
      // Primeiro, tenta buscar no LRCLIB
      try {
        const lrclibResponse = await fetch(
          `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
            music.artista,
          )}&track_name=${encodeURIComponent(music.musica)}`,
        )

        if (lrclibResponse.ok) {
          const data = await lrclibResponse.json()
          if (data.plainLyrics) {
            setLyrics(data.plainLyrics)
            setIsLoading(false)
            return
          }
        }
      } catch (err) {
        console.log("LRCLIB não encontrou a letra, tentando Genius...")
      }

      // Se não encontrou no LRCLIB, tenta no Genius
      try {
        const geniusResponse = await fetch(
          `/api/lyrics?artista=${encodeURIComponent(
            music.artista,
          )}&musica=${encodeURIComponent(music.musica)}`,
        )

        if (!geniusResponse.ok) {
          throw new Error(t.lyricsNotFound)
        }

        const data = await geniusResponse.json()
        if (data.lyrics) {
          setLyrics(data.lyrics)
        } else {
          throw new Error(t.lyricsNotFound)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t.failedLoadLyrics)
        setLyrics(t.lyricsNotAvailable)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLyrics()
  }, [isOpen, music, language, t])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[80vh] glass rounded-2xl overflow-hidden flex flex-col animate-in fade-in scale-95 duration-200">
          <div className="flex items-start justify-between p-4 md:p-6 border-b border-white/10">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-2xl font-bold text-foreground truncate">{music.musica}</h2>
              <p className="text-xs md:text-sm text-muted-foreground truncate">{music.artista}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
              aria-label="Close"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full border-3 border-accent/20 border-t-accent animate-spin mx-auto mb-3"></div>
                  <p className="text-muted-foreground text-sm md:text-base">{t.loadingLyrics}</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-2">⚠️</p>
                <p className="text-sm md:text-base">{error}</p>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed font-mono text-xs md:text-sm">
                {lyrics}
              </div>
            )}
          </div>

          <div className="flex gap-3 p-4 md:p-6 border-t border-white/10">
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
  )
}
