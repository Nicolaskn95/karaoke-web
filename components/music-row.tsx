"use client"

import type { Music } from "@/app/page"
import type { Language } from "@/lib/i18n"
import { useState } from "react"
import { translations } from "@/lib/i18n"
import ConfirmDialog from "./confirm-dialog"

interface MusicRowProps {
  music: Music
  onViewLyrics: () => void
  onAddToQueue: () => void
  language: Language
  isLoadingLyrics?: boolean
}

export default function MusicRow({ music, onViewLyrics, onAddToQueue, language, isLoadingLyrics = false }: MusicRowProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const t = translations[language]

  const handleAddClick = async () => {
    setShowConfirm(true)
  }

  const handleConfirmed = async () => {
    setIsAdding(true)
    try {
      await onAddToQueue()
      setShowConfirm(false)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div className="group glass rounded-lg px-3 md:px-4 py-3 hover:bg-card/60 transition-all duration-200 flex items-center justify-between overflow-x-auto">
        {/* ID Column */}
        <div className="flex-shrink-0 w-12 md:w-16">
          <p className="text-xs md:text-sm font-semibold text-accent">#{music.id}</p>
        </div>

        {/* Music Info */}
        <div className="flex-1 min-w-0 mx-3 md:mx-4">
          <h3 className="text-xs md:text-sm font-semibold text-foreground truncate">{music.musica}</h3>
          <p className="text-xs text-muted-foreground truncate">{music.artista}</p>
        </div>

        {/* Button Group */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onViewLyrics}
            disabled={isLoadingLyrics}
            className="px-2 md:px-3 py-1 md:py-1.5 rounded-md bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-200 text-xs font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isLoadingLyrics ? (
              <>
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <span>{t.loadingLyrics}</span>
              </>
            ) : (
              <span>{t.lyrics}</span>
            )}
          </button>
          <button
            onClick={handleAddClick}
            disabled={isAdding}
            className="px-2 md:px-3 py-1 md:py-1.5 rounded-md bg-accent/80 hover:bg-accent text-accent-foreground border border-accent/50 hover:border-accent transition-all duration-200 text-xs font-bold disabled:opacity-50 whitespace-nowrap"
          >
            {isAdding ? t.adding : t.queue}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title={t.confirmQueue}
        message={`${music.musica} - ${music.artista}`}
        confirmText={t.yes}
        cancelText={t.no}
        onConfirm={handleConfirmed}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
