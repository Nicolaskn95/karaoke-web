"use client"

import { useState } from "react"

interface NameModalProps {
  isOpen: boolean
  onSave: (name: string) => void
  onCancel: () => void
  defaultName?: string
}

export default function NameModal({
  isOpen,
  onSave,
  onCancel,
  defaultName = "",
}: NameModalProps) {
  const [name, setName] = useState(defaultName)

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm glass rounded-2xl overflow-hidden flex flex-col animate-in fade-in scale-95 duration-200">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              Digite seu nome
            </h2>
          </div>
          <form
            className="p-6 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) onSave(name.trim())
            }}
          >
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-border text-foreground bg-background"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80"
                onClick={onCancel}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                disabled={!name.trim()}
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
