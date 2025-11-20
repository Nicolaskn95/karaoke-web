"use client"

import type { Language } from "@/lib/i18n"
import { translations } from "@/lib/i18n"

interface HeaderProps {
  isDark: boolean
  onToggleTheme: () => void
  language: Language
  onToggleLanguage: () => void
}

export default function Header({ isDark, onToggleTheme, language, onToggleLanguage }: HeaderProps) {
  const t = translations[language]

  return (
    <header className="relative z-10 border-b border-white/5 glass sticky top-0">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 glow-accent">
              <span className="text-lg md:text-xl font-bold text-accent-foreground">♪</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-4xl font-bold gradient-text truncate">{t.title}</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block truncate">{t.subtitle}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onToggleLanguage}
              className="px-2 md:px-4 py-1.5 md:py-2 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-200 font-medium text-xs md:text-sm"
              aria-label="Toggle language"
              title={language === "en" ? "Português" : "English"}
            >
              {language === "en" ? "PT" : "EN"}
            </button>

            <button
              onClick={onToggleTheme}
              className="px-2 md:px-4 py-1.5 md:py-2 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-200 font-medium text-xs md:text-sm flex items-center gap-2"
              aria-label="Toggle theme"
            >
              {isDark ? "☀️" : "🌙"}
              <span className="hidden md:inline">{isDark ? t.light : t.dark}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
