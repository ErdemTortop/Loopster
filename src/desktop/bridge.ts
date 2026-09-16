/** One tab file found in the exercise folder. */
export interface LibraryItem {
  path: string
  name: string
  /** Folder relative to the library root, '' for files directly inside it. */
  folder: string
  size: number
  modifiedAt: number
}

export interface LibrarySnapshot {
  root: string
  items: LibraryItem[]
  /** True when the folder holds more tab files than the scan returns. */
  truncated: boolean
}

/** A tab file the shell read for us, e.g. one double-clicked in Explorer. */
export interface OpenedFile {
  name: string
  path: string
  data: Uint8Array
}

/** A take stored as a file on disk, described by its sidecar JSON. */
export interface StoredTake {
  id: string
  songId: string
  title: string
  createdAt: number
  durationMs: number
  mimeType: string
  speed: number
  bpm: number | null
  loopStart: number | null
  loopEnd: number | null
  sync?: unknown
  audio: string
  path: string
  metaPath: string
  size?: number
}

interface DesktopApi {
  desktop: true
  file: {
    pending: () => Promise<OpenedFile | null>
    onOpen: (listener: (file: OpenedFile) => void) => () => void
  }
  recordings: {
    folder: () => Promise<string>
    list: (songId: string) => Promise<StoredTake[]>
    save: (take: Record<string, unknown>) => Promise<StoredTake>
    read: (path: string) => Promise<Uint8Array>
    remove: (path: string, metaPath?: string) => Promise<boolean>
    reveal: (path: string) => Promise<boolean>
  }
  library: {
    pick: (dialogTitle: string) => Promise<LibrarySnapshot | null>
    restore: () => Promise<LibrarySnapshot | null>
    refresh: () => Promise<LibrarySnapshot | null>
    forget: () => Promise<boolean>
    read: (path: string) => Promise<{ name: string; data: Uint8Array }>
  }
}

declare global {
  interface Window {
    loopster?: DesktopApi
  }
}

/** The desktop shell's bridge, or undefined in a browser. */
export const desktopApi = (): DesktopApi | undefined => (typeof window === 'undefined' ? undefined : window.loopster)

export const isDesktop = (): boolean => desktopApi()?.desktop === true
