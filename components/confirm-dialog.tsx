"use client"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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
            <h2 className="text-lg md:text-xl font-bold text-foreground">{title}</h2>
          </div>

          <div className="p-6 text-center">
            <p className="text-foreground font-medium mb-2">{message}</p>
          </div>

          <div className="flex gap-3 p-6 border-t border-white/10">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-200 font-medium text-sm"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 rounded-lg bg-accent/80 hover:bg-accent text-accent-foreground border border-accent/50 hover:border-accent transition-all duration-200 font-bold text-sm"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
