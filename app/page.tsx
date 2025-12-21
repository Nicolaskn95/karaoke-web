"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import MusicGrid from "@/components/music-grid";
import LyricsModal from "@/components/lyrics-modal";
import Header from "@/components/header";
import UploadDialog from "@/components/upload-dialog";
import { translations } from "@/lib/i18n";

export interface Music {
  _id?: string;
  id: string;
  arquivo: string;
  artista: string;
  musica: string;
  inicio: string;
}

export default function Home() {
  const [selectedMusic, setSelectedMusic] = useState<Music | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const language = "pt";
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const handleViewLyrics = useCallback((music: Music) => {
    setSelectedMusic(music);
    setShowLyrics(true);
    setIsLoadingLyrics(true);
  }, []);

  const handleAddToQueue = useCallback(
    async (music: Music) => {
      const t = translations[language];

      try {
        const response = await fetch(`http://${process.env.NEXT_PUBLIC_KARAOKE_SERVICE_URL}/add-number`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ number: music.id }),
        });

        if (response.ok) {
          const data = await response.json();
          // Toast de sucesso mostrando o número da música
          toast.success(t.songAddedSuccess, {
            description: `${music.musica} - ${music.artista} (#${music.id})`,
            duration: 3000,
          });
        } else {
          const errorData = await response.json().catch(() => ({}));

          // Verifica se é erro de serviço indisponível
          if (response.status === 503 || response.status === 500) {
            toast.error(t.serviceUnavailable, {
              description:
                errorData.message ||
                errorData.error ||
                (language === "pt"
                  ? "O serviço de karaokê não está respondendo. Verifique se o serviço está em execução."
                  : "The karaoke service is not responding. Please check if the service is running."),
              duration: 5000,
            });
          } else {
            toast.error(t.songAddedError, {
              description:
                errorData.message ||
                errorData.error ||
                (language === "pt"
                  ? "Por favor, tente novamente mais tarde."
                  : "Please try again later."),
              duration: 4000,
            });
          }
        }
      } catch (error) {
        console.error("Error adding to queue:", error);

        // Erro de rede ou serviço não disponível
        toast.error(t.serviceUnavailable, {
          description:
            language === "pt"
              ? "Não foi possível conectar ao serviço de karaokê. Verifique se o serviço está em execução."
              : "Unable to connect to the karaoke service. Please check if the service is running.",
          duration: 5000,
        });
      }
    },
    [language]
  );

  const handleToggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  }, []);



  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onUploadClick={() => setShowUploadDialog(true)}
      />
      <MusicGrid
        onViewLyrics={handleViewLyrics}
        onAddToQueue={handleAddToQueue}
        language={language}
        isLoadingLyrics={isLoadingLyrics}
        selectedMusicId={selectedMusic?.id}
      />
      {selectedMusic && (
        <LyricsModal
          isOpen={showLyrics}
          onClose={() => {
            setShowLyrics(false);
            setIsLoadingLyrics(false);
          }}
          music={selectedMusic}
          language={language}
          onLoadingChange={setIsLoadingLyrics}
        />
      )}
      <UploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        language={language}
      />
    </main>
  );
}
