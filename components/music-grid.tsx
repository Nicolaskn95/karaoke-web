"use client";

import { useState, useEffect } from "react";
import MusicRow from "./music-row";
import PaginationControls from "./pagination-controls";
import FilterSection from "./filter-section";
import type { Music } from "@/app/page";
import type { Language } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

interface MusicGridProps {
  onViewLyrics: (music: Music) => void;
  onAddToQueue: (music: Music) => void;
  language: Language;
  isLoadingLyrics?: boolean;
  selectedMusicId?: string;
}

export default function MusicGrid({
  onViewLyrics,
  onAddToQueue,
  language,
  isLoadingLyrics = false,
  selectedMusicId,
}: MusicGridProps) {
  const [musics, setMusics] = useState<Music[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [filterApplied, setFilterApplied] = useState(false);
  const [filterParams, setFilterParams] = useState<{
    type?: "song" | "artist" | "number";
    value?: string;
  }>({});
  const t = translations[language];

  useEffect(() => {
    const fetchMusics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });

        // Add filter parameters if filter is applied
        if (filterApplied && filterParams.value) {
          if (filterParams.type === "song") {
            queryParams.append("musica", filterParams.value);
          } else if (filterParams.type === "artist") {
            queryParams.append("artista", filterParams.value);
          } else if (filterParams.type === "number") {
            queryParams.append("id", filterParams.value);
          }
        }

        const response = await fetch(`/api/musics?${queryParams.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch musics");
        }

        const data = await response.json();
        setMusics(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setMusics([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMusics();
  }, [currentPage, itemsPerPage, filterApplied, filterParams]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleApplyFilter = (
    searchType: "song" | "artist" | "number",
    searchValue: string
  ) => {
    if (!searchValue.trim()) {
      setFilterApplied(false);
      setFilterParams({});
      setCurrentPage(1);
      return;
    }

    setFilterParams({ type: searchType, value: searchValue });
    setFilterApplied(true);
    setCurrentPage(1);
  };

  const handleClearFilter = () => {
    setFilterApplied(false);
    setFilterParams({});
    setCurrentPage(1);
  };

  const displayMusics = musics;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <FilterSection
        onApplyFilter={handleApplyFilter}
        onClearFilter={handleClearFilter}
        language={language}
      />

      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-xs md:text-sm text-muted-foreground">
            {filterApplied
              ? `Found: ${displayMusics.length} songs`
              : `Showing ${
                  displayMusics.length > 0
                    ? (currentPage - 1) * itemsPerPage + 1
                    : 0
                } to ${Math.min(
                  currentPage * itemsPerPage,
                  (currentPage - 1) * itemsPerPage + displayMusics.length
                )}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">
            {t.songsPerPage}
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-medium hover:border-primary/50 transition-colors"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-accent/20 border-t-accent animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t.loading}</p>
          </div>
        </div>
      ) : displayMusics.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">{t.noSongs}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-12">
            {displayMusics.map((music) => (
              <MusicRow
                key={music.id}
                music={music}
                onViewLyrics={() => onViewLyrics(music)}
                onAddToQueue={() => onAddToQueue(music)}
                language={language}
                isLoadingLyrics={
                  isLoadingLyrics && selectedMusicId === music.id
                }
              />
            ))}
          </div>
          {!filterApplied && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
              language={language}
            />
          )}
        </>
      )}
    </div>
  );
}
