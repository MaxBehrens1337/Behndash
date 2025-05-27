"use client"

import { useEffect } from "react"

interface Shortcut {
  key: string
  action: () => void
  description: string
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[]
}

export function KeyboardShortcuts({ shortcuts }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea, or select
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      // Check for keyboard shortcuts
      shortcuts.forEach((shortcut) => {
        const isCtrlKey = shortcut.key.includes("Ctrl+")
        const isAltKey = shortcut.key.includes("Alt+")
        const isShiftKey = shortcut.key.includes("Shift+")
        const isMetaKey = shortcut.key.includes("Meta+")

        let keyToCheck = shortcut.key
        if (isCtrlKey) keyToCheck = keyToCheck.replace("Ctrl+", "")
        if (isAltKey) keyToCheck = keyToCheck.replace("Alt+", "")
        if (isShiftKey) keyToCheck = keyToCheck.replace("Shift+", "")
        if (isMetaKey) keyToCheck = keyToCheck.replace("Meta+", "")

        if (
          event.key.toLowerCase() === keyToCheck.toLowerCase() &&
          event.ctrlKey === isCtrlKey &&
          event.altKey === isAltKey &&
          event.shiftKey === isShiftKey &&
          event.metaKey === isMetaKey
        ) {
          event.preventDefault()
          shortcut.action()
        }
      })
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [shortcuts])

  // This component doesn't render anything
  return null
}
