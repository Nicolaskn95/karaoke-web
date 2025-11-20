"use client"

import { useState, useCallback } from "react"
import MusicGrid from "@/components/music-grid"
import LyricsModal from "@/components/lyrics-modal"
import Header from "@/components/header"
import type { Language } from "@/lib/i18n"

export interface Music {
  _id?: string
  id: string
  arquivo: string
  artista: string
  musica: string
  inicio: string
}

export default function Home() {
  const [selectedMusic, setSelectedMusic] = useState<Music | null>(null)
  const [showLyrics, setShowLyrics] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [language, setLanguage] = useState<Language>("en")

  const handleViewLyrics = useCallback((music: Music) => {
    setSelectedMusic(music)
    setShowLyrics(true)
  }, [])

  const handleAddToQueue = useCallback(async (music: Music) => {
    try {
      const response = await fetch("/api/add-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ number: music.id }),
      })

      if (response.ok) {
        console.log("Added to queue:", music.musica)
      }
    } catch (error) {
      console.error("Error adding to queue:", error)
    }
  }, [])

  const handleToggleTheme = useCallback(() => {
    setIsDark((prev) => !prev)
    document.documentElement.classList.toggle("dark")
  }, [])

  const handleToggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "en" ? "pt" : "en"))
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        language={language}
        onToggleLanguage={handleToggleLanguage}
      />
      <MusicGrid onViewLyrics={handleViewLyrics} onAddToQueue={handleAddToQueue} language={language} />
      {selectedMusic && (
        <LyricsModal
          isOpen={showLyrics}
          onClose={() => setShowLyrics(false)}
          music={selectedMusic}
          language={language}
        />
      )}
    </main>
  )
}
