import { desktopApi, isDesktop, type StoredTake } from '../desktop/bridge'
import {
  addRecording,
  deleteRecording,
  listRecordings,
  releaseUrl,
  type Recording,
  type RecordingSync,
} from './recordingsDb'

/**
 * Where takes are kept. In the browser that is IndexedDB; in the desktop app they are normal files
 * in a folder, so they can be backed up or opened with something else.
 */
export interface RecordingsStore {
  readonly onDisk: boolean
  folder: () => Promise<string | null>
  list: (songId: string) => Promise<Recording[]>
  add: (recording: Recording, songTitle: string) => Promise<Recording>
  remove: (recording: Recording) => Promise<void>
  blobFor: (recording: Recording) => Promise<Blob>
  reveal: (recording: Recording) => Promise<void>
}

const browserStore: RecordingsStore = {
  onDisk: false,
  folder: async () => null,
  list: (songId) => listRecordings(songId),
  add: async (recording) => {
    await addRecording(recording)
    return recording
  },
  remove: async (recording) => {
    await deleteRecording(recording.id)
    if (recording.blob) releaseUrl(recording.blob)
  },
  blobFor: async (recording) => {
    if (!recording.blob) throw new Error('Take has no audio.')
    return recording.blob
  },
  reveal: async () => {},
}

/** Audio read back from disk, so one take is never read twice while the app is open. */
const diskAudio = new Map<string, Blob>()

function toRecording(take: StoredTake): Recording {
  return {
    id: take.id,
    songId: take.songId,
    createdAt: take.createdAt,
    durationMs: take.durationMs,
    mimeType: take.mimeType,
    speed: take.speed,
    bpm: take.bpm,
    loopStart: take.loopStart,
    loopEnd: take.loopEnd,
    sync: take.sync as RecordingSync | undefined,
    path: take.path,
    metaPath: take.metaPath,
  }
}

const desktopStore: RecordingsStore = {
  onDisk: true,
  folder: () => desktopApi()!.recordings.folder(),
  list: async (songId) => (await desktopApi()!.recordings.list(songId)).map(toRecording),
  add: async (recording, songTitle) => {
    if (!recording.blob) throw new Error('Nothing to save: the take has no audio.')
    const saved = await desktopApi()!.recordings.save({
      id: recording.id,
      songId: recording.songId,
      title: songTitle,
      createdAt: recording.createdAt,
      durationMs: recording.durationMs,
      mimeType: recording.mimeType,
      speed: recording.speed,
      bpm: recording.bpm,
      loopStart: recording.loopStart,
      loopEnd: recording.loopEnd,
      sync: recording.sync,
      data: new Uint8Array(await recording.blob.arrayBuffer()),
    })
    diskAudio.set(saved.path, recording.blob)
    return { ...recording, path: saved.path, metaPath: saved.metaPath }
  },
  remove: async (recording) => {
    if (!recording.path) return
    await desktopApi()!.recordings.remove(recording.path, recording.metaPath)
    const cached = diskAudio.get(recording.path)
    if (cached) releaseUrl(cached)
    diskAudio.delete(recording.path)
  },
  blobFor: async (recording) => {
    if (recording.blob) return recording.blob
    if (!recording.path) throw new Error('Take has no file path.')
    const cached = diskAudio.get(recording.path)
    if (cached) return cached
    const bytes = await desktopApi()!.recordings.read(recording.path)
    const blob = new Blob([bytes as BlobPart], { type: recording.mimeType })
    diskAudio.set(recording.path, blob)
    return blob
  },
  reveal: async (recording) => {
    if (recording.path) await desktopApi()!.recordings.reveal(recording.path)
  },
}

export const recordingsStore: RecordingsStore = isDesktop() ? desktopStore : browserStore
