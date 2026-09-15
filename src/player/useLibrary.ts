import { useCallback, useEffect, useRef, useState } from 'react'
import { desktopApi, isDesktop, type LibraryItem, type LibrarySnapshot } from '../desktop/bridge'

/**
 * The desktop app's exercise folder: a folder of tab files the user picks once, listed for one-click
 * opening. In a browser there is no such folder and the hook stays inert.
 */
export function useLibrary(onOpen: (file: File) => void) {
  const supported = isDesktop()
  const [snapshot, setSnapshot] = useState<LibrarySnapshot | null>(null)
  // The desktop shell starts reading the remembered folder right away.
  const [busy, setBusy] = useState(supported)
  const [error, setError] = useState<string | null>(null)
  const [openPath, setOpenPath] = useState<string | null>(null)

  const onOpenRef = useRef(onOpen)
  useEffect(() => {
    onOpenRef.current = onOpen
  })

  // Reopen the folder from the last session.
  useEffect(() => {
    if (!supported) return
    let cancelled = false
    desktopApi()
      ?.library.restore()
      .then((result) => {
        if (!cancelled && result) setSnapshot(result)
      })
      .catch(() => {
        if (!cancelled) setError('Önceki klasör açılamadı.')
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [supported])

  const run = useCallback(async (action: () => Promise<LibrarySnapshot | null>, failure: string) => {
    setBusy(true)
    setError(null)
    try {
      const result = await action()
      if (result) setSnapshot(result)
      return result
    } catch {
      setError(failure)
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  const pick = useCallback(
    () => run(() => desktopApi()!.library.pick(), 'Klasör açılamadı.'),
    [run],
  )

  const refresh = useCallback(
    () => run(() => desktopApi()!.library.refresh(), 'Klasör yeniden okunamadı.'),
    [run],
  )

  const forget = useCallback(async () => {
    setError(null)
    try {
      await desktopApi()?.library.forget()
    } catch {
      // Clearing it in the window is enough; the folder is re-picked anyway.
    }
    setSnapshot(null)
    setOpenPath(null)
  }, [])

  const open = useCallback(async (item: LibraryItem) => {
    setError(null)
    try {
      const file = await desktopApi()!.library.read(item.path)
      // The rest of the app works with File objects, exactly like a dropped or picked file.
      onOpenRef.current(new File([file.data as BlobPart], file.name))
      setOpenPath(item.path)
    } catch {
      setError(`"${item.name}" okunamadı. Dosya taşınmış ya da silinmiş olabilir.`)
    }
  }, [])

  return { supported, snapshot, busy, error, openPath, pick, refresh, forget, open }
}

export type Library = ReturnType<typeof useLibrary>
