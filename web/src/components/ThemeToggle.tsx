// Persists the user's theme preference in localStorage and applies it via
// data-theme on <html>. The inline script in index.html prevents FOUC on reload.
// localStorage is written ONLY after the user clicks — not on mount — so the
// FR-A5 test asserting localStorage.length === 0 on fresh login still passes.
import { useEffect, useRef, useState } from 'react'
import { cs } from '../i18n/cs'

type Theme = 'light' | 'dark'

function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem('ui-theme')
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme())
  const userActed = useRef(storedTheme() !== null)

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = theme
      if (userActed.current) {
        localStorage.setItem('ui-theme', theme)
      }
    } catch {
      // localStorage may be unavailable (private browsing, jsdom)
    }
  }, [theme])

  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  function toggle() {
    userActed.current = true
    setTheme(next)
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={cs.theme[next]}
      onClick={toggle}
    >
      {cs.theme[next]}
    </button>
  )
}
