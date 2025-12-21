"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
// ...existing code...
import { translations } from "@/lib/i18n";
import { Upload, FileText } from "lucide-react";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

export default function UploadDialog({
  isOpen,
  onClose,
  // idioma fixo removido
}: UploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations['pt'];

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar extensão do arquivo
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".ini")) {
      toast.error(t.invalidFileType, {
        description: fileName,
        duration: 4000,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t.uploadError, {
        description: t.selectFile,
        duration: 4000,
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Usar a mesma variável de ambiente que outras rotas
      const apiUrl = process.env.NEXT_PUBLIC_EXPRESS_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/musics/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Upload failed"
        );
      }

      const data = await response.json();
      
      toast.success(t.uploadSuccess, {
        description: true
          ? `Novas: ${data.stats.new}, Atualizadas: ${data.stats.updated}, Sem alterações: ${data.stats.unchanged}`
          : `New: ${data.stats.new}, Updated: ${data.stats.updated}, Unchanged: ${data.stats.unchanged}`,
        duration: 5000,
      });

      // Resetar estado
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t.uploadError, {
        description:
          error instanceof Error
            ? error.message
            : true
            ? "Erro ao fazer upload do arquivo"
            : "Error uploading file",
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md glass rounded-2xl overflow-hidden flex flex-col animate-in fade-in scale-95 duration-200">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg md:text-xl font-bold text-foreground">{t.uploadMusics}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t.uploadFile}</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {selectedFile ? (
                    <>
                      <FileText className="w-10 h-10 mb-2 text-primary" />
                      <p className="mb-2 text-sm text-foreground font-medium">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-foreground">
                        <span className="font-semibold">{t.selectFile}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {true
                          ? "Apenas arquivos .ini"
                          : "Only .ini files"}
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".ini"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-white/10">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.close}
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1 px-4 py-2 rounded-lg bg-accent/80 hover:bg-accent text-accent-foreground border border-accent/50 hover:border-accent transition-all duration-200 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin"></div>
                  {t.uploading}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {"Enviar"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

