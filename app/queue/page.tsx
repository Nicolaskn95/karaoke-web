"use client";

import { useEffect, useState } from "react";
import Header from "@/components/header";
import { translations } from "@/lib/i18n";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface QueueEntry {
  _id: string;
  musicId: string;
  name: string;
  date: string;
  time: string;
  createdAt: string;
  musica?: string | null;
  artista?: string | null;
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const t = translations["pt"];

  // Inicializar tema
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setIsDark(isDarkMode);
    }
  }, []);

  // Toggle theme function
  const handleToggleTheme = () => {
    setIsDark(!isDark);
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark");
    }
  };

  // Upload click handler (pode ser vazio se não precisar)
  const handleUploadClick = () => {
    // Pode navegar para home ou abrir modal
  };

  useEffect(() => {
    async function fetchQueue() {
      setLoading(true);
      setError(null);
      try {
        // No frontend, precisa usar NEXT_PUBLIC_ para variáveis de ambiente
        const expressUrl = process.env.EXPRESS_API_URL;
        console.log(expressUrl);
        const res = await fetch(`${expressUrl}/queue/today`);
        if (!res.ok) throw new Error("Erro ao buscar fila");
        const data = await res.json();
        setQueue(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchQueue();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onUploadClick={handleUploadClick}
      />

      <div className="max-w-4xl mx-auto py-8 px-4 md:px-6">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition-all duration-200"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text">
            {t.queue}
          </h1>
        </div>

        {loading && (
          <div className="glass rounded-lg p-8 text-center">
            <div className="w-10 h-10 rounded-full border-3 border-accent/20 border-t-accent animate-spin mx-auto mb-3"></div>
            <p className="text-muted-foreground">{t.loading}</p>
          </div>
        )}

        {error && (
          <div className="glass rounded-lg p-6 border border-red-500/30 bg-red-500/10">
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && queue.length === 0 && (
          <div className="glass rounded-lg p-8 text-center">
            <p className="text-muted-foreground text-lg">
              Nenhuma música na fila hoje.
            </p>
          </div>
        )}

        {!loading && !error && queue.length > 0 && (
          <div className="space-y-3">
            {queue.map((item, index) => (
              <div
                key={item._id}
                className="glass rounded-lg p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 border border-white/5 hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.musica ? (
                      <>
                        <p className="font-semibold text-lg truncate">
                          {item.musica}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.artista && `${item.artista} • `}
                          {item.name}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-lg truncate">
                          {item.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ID: {item.musicId}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Horário</p>
                    <p className="font-semibold text-lg">{item.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
