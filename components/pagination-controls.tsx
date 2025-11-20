"use client"

import type { Language } from "@/lib/i18n"

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPreviousPage: () => void
  onNextPage: () => void
  language: Language
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  language,
}: PaginationControlsProps) {
  const prevLabel = language === "en" ? "← Previous" : "← Anterior"
  const nextLabel = language === "en" ? "Next →" : "Próximo →"

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
      <button
        onClick={onPreviousPage}
        disabled={currentPage === 1}
        className="px-4 md:px-6 py-2 rounded-lg glass hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm md:text-base"
      >
        {prevLabel}
      </button>

      <div className="glass px-4 md:px-6 py-2 rounded-lg">
        <span className="font-semibold text-accent">{currentPage}</span>
        <span className="text-muted-foreground mx-1">/</span>
        <span className="text-muted-foreground">{totalPages}</span>
      </div>

      <button
        onClick={onNextPage}
        disabled={currentPage === totalPages}
        className="px-4 md:px-6 py-2 rounded-lg glass hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm md:text-base"
      >
        {nextLabel}
      </button>
    </div>
  )
}
