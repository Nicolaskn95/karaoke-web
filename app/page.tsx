"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import MusicGrid from "@/components/music-grid";
import LyricsModal from "@/components/lyrics-modal";
import Header from "@/components/header";
import UploadDialog from "@/components/upload-dialog";
import NameModal from "@/components/name-modal";
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
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingMusic, setPendingMusic] = useState<Music | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Carregar nome do localStorage na inicialização
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("karaokeUserName");
      if (savedName) {
        setUserName(savedName);
      }
    }
  }, []);

  const handleViewLyrics = useCallback((music: Music) => {
    setSelectedMusic(music);
    setShowLyrics(true);
    setIsLoadingLyrics(true);
  }, []);

  const handleAddToQueue = useCallback(
    async (music: Music, name?: string) => {
      const t = translations[language];
      const finalName = name || userName;

      // Se não tem nome, mostrar modal
      if (!finalName) {
        setPendingMusic(music);
        setShowNameModal(true);
        return;
      }

      try {
        // Preparar data e hora
        const now = new Date();
        const date = now.toISOString().slice(0, 10); // yyyy-mm-dd
        const time = now.toTimeString().slice(0, 5); // HH:MM

        // Fazer POST nas duas rotas em paralelo
        const karaokeUrl = process.env.NEXT_PUBLIC_KARAOKE_SERVICE_URL
          ? `${process.env.NEXT_PUBLIC_KARAOKE_SERVICE_URL}/add-number`
          : "http://localhost:4000/add-number";

        const expressUrl = process.env.EXPRESS_API_URL;

        const [karaokeResponse, expressResponse] = await Promise.allSettled([
          // POST para o serviço KARAOKE
          fetch(karaokeUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ number: music.id }),
          }),
          // POST para a API Express
          fetch(`${expressUrl}/queue/add`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              musicId: music.id,
              name: finalName,
              date,
              time,
            }),
          }),
        ]);

        // Verificar resultado do KARAOKE
        let karaokeSuccess = false;
        if (
          karaokeResponse.status === "fulfilled" &&
          karaokeResponse.value.ok
        ) {
          karaokeSuccess = true;
        } else if (karaokeResponse.status === "fulfilled") {
          // Tentar ler mensagem de erro se disponível
          try {
            const errorData = await karaokeResponse.value
              .json()
              .catch(() => ({}));
            console.error("KARAOKE service error:", errorData);
          } catch (e) {
            console.error(
              "KARAOKE service error:",
              karaokeResponse.value.status
            );
          }
        } else {
          console.error(
            "KARAOKE service connection error:",
            karaokeResponse.reason
          );
        }

        // Verificar resultado do Express
        let expressSuccess = false;
        if (
          expressResponse.status === "fulfilled" &&
          expressResponse.value.ok
        ) {
          expressSuccess = true;
        } else if (expressResponse.status === "fulfilled") {
          // Tentar ler mensagem de erro se disponível
          try {
            const errorData = await expressResponse.value
              .json()
              .catch(() => ({}));
            console.error("Express API error:", errorData);
          } catch (e) {
            console.error("Express API error:", expressResponse.value.status);
          }
        } else {
          console.error(
            "Express API connection error:",
            expressResponse.reason
          );
        }

        // Se pelo menos um dos dois funcionou, mostrar sucesso
        if (karaokeSuccess || expressSuccess) {
          toast.success(t.songAddedSuccess, {
            description: `${music.musica} - ${music.artista} (#${music.id})`,
            duration: 3000,
          });
        } else {
          // Se ambos falharam
          if (
            karaokeResponse.status === "rejected" ||
            expressResponse.status === "rejected"
          ) {
            toast.error(t.serviceUnavailable, {
              description:
                language === "pt"
                  ? "Não foi possível conectar aos serviços. Verifique se os serviços estão em execução."
                  : "Unable to connect to the services. Please check if the services are running.",
              duration: 5000,
            });
          } else {
            toast.error(t.songAddedError, {
              description:
                language === "pt"
                  ? "Erro ao adicionar à fila. Por favor, tente novamente mais tarde."
                  : "Error adding to queue. Please try again later.",
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
              ? "Não foi possível conectar aos serviços. Verifique se os serviços estão em execução."
              : "Unable to connect to the services. Please check if the services are running.",
          duration: 5000,
        });
      }
    },
    [language, userName]
  );

  // Handler para salvar nome do modal
  const handleSaveName = useCallback(
    (name: string) => {
      localStorage.setItem("karaokeUserName", name);
      setUserName(name);
      setShowNameModal(false);
      if (pendingMusic) {
        handleAddToQueue(pendingMusic, name);
        setPendingMusic(null);
      }
    },
    [pendingMusic, handleAddToQueue]
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
      <NameModal
        isOpen={showNameModal}
        onSave={handleSaveName}
        onCancel={() => {
          setShowNameModal(false);
          setPendingMusic(null);
        }}
        defaultName={userName || ""}
      />
    </main>
  );
}
