"use client"

import { useEffect, useState } from "react"

interface QueueEntry {
  _id: string
  musicId: string
  name: string
  date: string
  time: string
  createdAt: string
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchQueue() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          process.env.EXPRESS_API_URL
            ? `${process.env.EXPRESS_API_URL}/queue/today`
            : "http://localhost:3000/queue/today"
        )
        if (!res.ok) throw new Error("Erro ao buscar fila")
        const data = await res.json()
        setQueue(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchQueue()
  }, [])

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Fila de Músicas de Hoje</h1>
      {loading && <p>Carregando...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && queue.length === 0 && <p>Nenhuma música na fila hoje.</p>}
      {!loading && !error && queue.length > 0 && (
        <ul className="space-y-4">
          {queue.map((item) => (
            <li key={item._id} className="glass rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <span className="font-semibold">Música ID:</span> {item.musicId}
              </div>
              <div>
                <span className="font-semibold">Nome:</span> {item.name}
              </div>
              <div>
                <span className="font-semibold">Horário:</span> {item.time}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
