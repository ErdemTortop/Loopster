import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

function App() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-neutral-100 light:bg-neutral-50 light:text-neutral-900">
      <h1 className="text-5xl font-bold tracking-tight">Loopster</h1>
      <p className="max-w-md text-center text-lg text-neutral-400 light:text-neutral-600">
        Gitar pratik aracı. İskelet hazır, dosya açma özelliği bir sonraki aşamada gelecek.
      </p>
      <button
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="rounded-lg border border-neutral-700 px-5 py-3 text-base font-medium hover:bg-neutral-800 light:border-neutral-300 light:hover:bg-neutral-200"
      >
        {theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
      </button>
    </main>
  )
}

export default App
