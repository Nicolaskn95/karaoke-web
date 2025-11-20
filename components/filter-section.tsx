"use client"

import { useState } from "react"
import type { Language } from "@/lib/i18n"
import { translations } from "@/lib/i18n"

interface FilterSectionProps {
  onApplyFilter: (searchType: "song" | "artist" | "number", searchValue: string) => void
  onClearFilter: () => void
  language: Language
}

export default function FilterSection({ onApplyFilter, onClearFilter, language }: FilterSectionProps) {
  const [searchType, setSearchType] = useState<"song" | "artist" | "number">("song")
  const [searchValue, setSearchValue] = useState("")
  const t = translations[language]

  const handleFilter = () => {
    onApplyFilter(searchType, searchValue)
  }

  const handleClear = () => {
    setSearchValue("")
    onClearFilter()
  }

  return (
    <div className="mb-8 glass rounded-lg p-4 md:p-6">
      <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">{t.filter}</h3>

      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs md:text-sm text-muted-foreground">{t.search}</label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as "song" | "artist" | "number")}
            className="px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-medium hover:border-primary/50 transition-colors"
          >
            <option value="song">{t.songName}</option>
            <option value="artist">{t.artist}</option>
            <option value="number">{t.songNumber}</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs md:text-sm text-muted-foreground">&nbsp;</label>
          <input
            type={searchType === "number" ? "number" : "text"}
            placeholder={searchType === "song" ? t.songName : searchType === "artist" ? t.artist : t.songNumber}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleFilter()}
            className="px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="flex gap-2 self-end">
          <button
            onClick={handleFilter}
            className="px-4 py-2 rounded-lg bg-accent/80 hover:bg-accent text-accent-foreground border border-accent/50 hover:border-accent transition-all duration-200 font-semibold text-sm whitespace-nowrap"
          >
            {t.filterButton}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-200 font-medium text-sm whitespace-nowrap"
          >
            {t.clearFilter}
          </button>
        </div>
      </div>
    </div>
  )
}
