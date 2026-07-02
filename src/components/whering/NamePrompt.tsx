"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Reusable name prompt modal used by Shuffler and Canvas save flows.
 * Asks the user for an outfit name before persisting.
 */
export function NamePrompt({
  defaultName = "My Look",
  subtitle = "Give this outfit a name so you can find it later.",
  onConfirm,
  onCancel,
}: {
  defaultName?: string
  subtitle?: string
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  return (
    <div
      className="absolute inset-0 z-20 flex items-end justify-center bg-black/40"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div className="mx-4 mb-20 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Name your look
        </h3>
        <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onConfirm(name.trim())
            if (e.key === "Escape") onCancel()
          }}
          placeholder={defaultName}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
        />
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => name.trim() && onConfirm(name.trim())}
            className="flex-1 rounded-xl bg-black py-3 text-sm font-semibold text-white hover:bg-gray-900 transition-colors disabled:opacity-40"
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
