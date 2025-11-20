import { type NextRequest, NextResponse } from "next/server"

// Mock data - replace with actual backend call
const MOCK_MUSICS = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  arquivo: `song${i + 1}.mp3`,
  artista: ["The Beatles", "Queen", "Led Zeppelin", "Pink Floyd", "David Bowie"][i % 5],
  musica: ["Let It Be", "Bohemian Rhapsody", "Stairway to Heaven", "Comfortably Numb", "Space Oddity"][i % 5],
  inicio: "0:00",
}))

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1", 10)
  const limit = Number.parseInt(searchParams.get("limit") || "12", 10)

  // Validate pagination parameters
  const validPage = Math.max(1, page)
  const validLimit = Math.min(Math.max(1, limit), 100)

  const startIndex = (validPage - 1) * validLimit
  const endIndex = startIndex + validLimit
  const data = MOCK_MUSICS.slice(startIndex, endIndex)

  const totalPages = Math.ceil(MOCK_MUSICS.length / validLimit)

  return NextResponse.json({
    data,
    pagination: {
      page: validPage,
      limit: validLimit,
      total: MOCK_MUSICS.length,
      totalPages,
    },
  })
}
