/** Recordings live in IndexedDB: audio blobs are far too big for localStorage. */

/** Tab timing captured during a take, so it can later be replayed together with the tab. */
export interface RecordingSync {
  /** Milliseconds from the start of the audio to the first tab beat (count-in excluded). */
  anchorMs: number
  /** Song tick and tempo percentage of that first beat. */
  tick: number
  speed: number
  /** Loop at that moment (zero-based bars), or null when no loop was active. */
  loopStart: number | null
  loopEnd: number | null
  /**
   * Tempo changes during the take. With a loop they are keyed by loop round (relative to the first beat),
   * because the speed trainer changes speed when the loop wraps; without a loop by beat index.
   */
  speedChanges: { beat: number; round: number; speed: number }[]
  /** If the tab was paused mid-take, the replay stays in sync only up to this beat index. */
  lastSyncedBeat: number | null
}

export interface Recording {
  id: string
  songId: string
  createdAt: number
  durationMs: number
  mimeType: string
  /** In the browser the audio is always here; on the desktop it is read from `path` when needed. */
  blob?: Blob
  /** Desktop only: where the take and its sidecar live on disk. */
  path?: string
  metaPath?: string
  speed: number
  bpm: number | null
  /** Zero-based loop bars at the time of recording, or null when no loop was active. */
  loopStart: number | null
  loopEnd: number | null
  /** Present only for takes recorded while the tab was playing. */
  sync?: RecordingSync
}

const DB_NAME = 'loopster'
const DB_VERSION = 1
const STORE = 'recordings'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('songId', 'songId')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

function settle<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function addRecording(recording: Recording): Promise<void> {
  const db = await openDb()
  await settle(db.transaction(STORE, 'readwrite').objectStore(STORE).put(recording))
}

export async function listRecordings(songId: string): Promise<Recording[]> {
  const db = await openDb()
  const items = (await settle(db.transaction(STORE).objectStore(STORE).index('songId').getAll(songId))) as Recording[]
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await openDb()
  await settle(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id))
}

// One object URL per blob for the whole session; revoked when the recording is deleted.
const urls = new WeakMap<Blob, string>()

export function urlFor(blob: Blob): string {
  let url = urls.get(blob)
  if (!url) {
    url = URL.createObjectURL(blob)
    urls.set(blob, url)
  }
  return url
}

export function releaseUrl(blob: Blob): void {
  const url = urls.get(blob)
  if (url) URL.revokeObjectURL(url)
  urls.delete(blob)
}
