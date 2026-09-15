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

interface DesktopApi {
  desktop: true
  library: {
    pick: () => Promise<LibrarySnapshot | null>
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
