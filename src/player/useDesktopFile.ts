import { useEffect, useRef } from 'react'
import { desktopApi, type OpenedFile } from '../desktop/bridge'

/**
 * Opens tab files the desktop shell hands over: the one the app was started with when a .gp5 is
 * double-clicked in Explorer, and any opened later while the app is running.
 */
export function useDesktopFile(onOpen: (file: File) => void) {
  const onOpenRef = useRef(onOpen)
  useEffect(() => {
    onOpenRef.current = onOpen
  })

  useEffect(() => {
    const api = desktopApi()
    if (!api) return
    let cancelled = false
    const open = (file: OpenedFile) => {
      if (!cancelled) onOpenRef.current(new File([file.data as BlobPart], file.name))
    }
    api.file
      .pending()
      .then((file) => {
        if (file) open(file)
      })
      .catch(() => {
        // Nothing was waiting, or it could not be read; the user can still open a file by hand.
      })
    const unsubscribe = api.file.onOpen(open)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])
}
