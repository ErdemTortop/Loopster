import { useEffect, useRef, useState, type RefObject } from 'react'
import { urlFor, type Recording } from '../player/recordingsDb'
import { recordingsStore } from '../player/recordingsStore'
import { NUDGE_LIMIT_MS, type PlayAlong } from '../player/usePlayAlong'
import { formatClock } from '../player/usePomodoro'
import type { Recorder } from '../player/useRecorder'
import { Button, Toggle } from './ui'

const linkButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-raised px-3 font-display text-base font-semibold tracking-wide text-ink uppercase transition-colors hover:border-accent/60'

function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40)
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'm4a'
  return 'webm'
}

interface Props {
  recorder: Recorder
  playAlong: PlayAlong
  songTitle: string
}

const smallLabelClass = 'font-display text-xs font-semibold tracking-[0.14em] text-muted uppercase'

export function RecordingsSection({ recorder, playAlong, songTitle }: Props) {
  const recording = recorder.state === 'recording'
  const anySynced = recorder.recordings.some((take) => take.sync)
  const [folder, setFolder] = useState<string | null>(null)

  useEffect(() => {
    if (!recordingsStore.onDisk) return
    recordingsStore
      .folder()
      .then(setFolder)
      .catch(() => {
        // Only the hint text is missing then.
      })
  }, [])

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="grid grid-cols-2 gap-2">
        <Toggle
          on={recording}
          tone="red"
          onClick={recorder.toggle}
          disabled={!recorder.supported || recorder.state === 'requesting'}
        >
          {recording ? 'Kaydı durdur' : recorder.state === 'requesting' ? 'İzin bekleniyor…' : 'Kayda başla'}
        </Toggle>
        <Toggle on={recorder.syncPlayback} onClick={() => recorder.setSyncPlayback(!recorder.syncPlayback)}>
          Tab da çalsın
        </Toggle>
      </div>
      {!recorder.supported && (
        <p className="text-sm text-muted">Bu tarayıcıda ses kaydı kullanılamıyor (https ya da localhost gerekir).</p>
      )}

      {anySynced && (
        <div className="space-y-2 rounded-lg border border-line bg-bg/40 p-3">
          <p className={smallLabelClass}>Tab ile birlikte dinleme</p>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-12 text-muted">Kayıt</span>
            <input
              type="range"
              min={-100}
              max={100}
              step={5}
              value={Math.round(playAlong.balance * 100)}
              onChange={(e) => playAlong.setBalance(Number(e.target.value) / 100)}
              onDoubleClick={() => playAlong.setBalance(0)}
              aria-label="Kayıt ve tab ses dengesi"
              title="Çift tıkla: ikisi eşit"
              className="h-8 min-w-0 flex-1 accent-accent"
            />
            <span className="w-8 text-right text-muted">Tab</span>
          </label>
          <label className="flex items-center gap-2 text-sm" title="Mikrofon gecikmesini düzeltmek için. + kaydı geciktirir, − öne alır.">
            <span className="w-12 text-muted">Kaydır</span>
            <input
              type="range"
              min={-NUDGE_LIMIT_MS}
              max={NUDGE_LIMIT_MS}
              step={5}
              value={playAlong.nudgeMs}
              onChange={(e) => playAlong.setNudge(Number(e.target.value))}
              onDoubleClick={() => playAlong.setNudge(0)}
              aria-label="Kayıt zamanlamasını kaydır"
              className="h-8 min-w-0 flex-1 accent-accent"
            />
            <span className="led w-16 text-right text-sm">
              {playAlong.nudgeMs > 0 ? '+' : ''}
              {playAlong.nudgeMs} ms
            </span>
          </label>
          {playAlong.error && <p className="text-sm text-danger">{playAlong.error}</p>}
        </div>
      )}

      {recorder.recordings.length > 0 ? (
        <ul className="space-y-2">
          {recorder.recordings.map((take) => (
            <RecordingItem
              key={take.id}
              take={take}
              songTitle={songTitle}
              playAlong={playAlong}
              onDelete={() => void recorder.remove(take)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Bu parça için henüz kayıt yok. Kayda başla ya da R tuşuna bas.</p>
      )}

      <p className="text-xs text-muted">
        {recordingsStore.onDisk
          ? `Kayıtlar dosya olarak ${folder ?? 'Belgeler klasöründe'} tutulur; silinenler geri dönüşüm kutusuna gider. `
          : 'Kayıtlar bu tarayıcıda saklanır. '}
        Hoparlörden çalan tab da mikrofona girer; sadece kendi çalışını kaydetmek için kulaklık kullan.
      </p>
    </div>
  )
}

interface ItemProps {
  take: Recording
  songTitle: string
  playAlong: PlayAlong
  onDelete: () => void
}

function RecordingItem({ take, songTitle, playAlong, onDelete }: ItemProps) {
  const playingAlong = playAlong.playingId === take.id
  const preparing = playAlong.preparingId === take.id
  const [confirming, setConfirming] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  useKnownDuration(audioRef)
  const url = useTakeUrl(take)
  const date = new Date(take.createdAt)
  const stamp = date.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const fileName = `${slug(songTitle) || 'loopster'}-${date.toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${extensionFor(take.mimeType)}`
  const details = [
    formatClock(take.durationMs),
    `%${Math.round(take.speed)}`,
    take.bpm ? `${take.bpm} BPM` : null,
    take.loopStart !== null && take.loopEnd !== null ? `Loop ${take.loopStart + 1}–${take.loopEnd + 1}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="space-y-2 rounded-lg border border-line bg-bg/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-display text-base font-semibold tracking-wide uppercase">{stamp}</span>
        <span className="font-mono text-xs text-muted">{details}</span>
      </div>
      {url ? (
        <audio ref={audioRef} controls preload="metadata" src={url} className="h-10 w-full" />
      ) : (
        <p className="text-sm text-muted">Ses dosyası okunuyor…</p>
      )}
      {take.sync ? (
        <Toggle
          on={playingAlong || preparing}
          onClick={() => playAlong.toggle(take)}
          title="Kaydını, kayıt sırasındaki tab ayarlarıyla tab'ın sesiyle aynı anda çalar"
          className="w-full"
        >
          {playingAlong ? 'Birlikte dinlemeyi durdur' : preparing ? 'Hazırlanıyor…' : 'Tab ile birlikte dinle'}
        </Toggle>
      ) : (
        <p className="text-xs text-muted">Tab çalmadan yapılmış; sadece tek başına dinlenebilir.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {recordingsStore.onDisk ? (
          <Button onClick={() => void recordingsStore.reveal(take)}>Klasörde göster</Button>
        ) : (
          url && (
            <a href={url} download={fileName} className={linkButtonClass}>
              İndir
            </a>
          )
        )}
        {confirming ? (
          <>
            <Button onClick={onDelete} className="border-danger text-danger">
              Evet, sil
            </Button>
            <Button onClick={() => setConfirming(false)}>Vazgeç</Button>
          </>
        ) : (
          <Button onClick={() => setConfirming(true)}>Sil</Button>
        )}
      </div>
    </li>
  )
}

/** The audio of a take: already in memory for a fresh one, read from disk for an older desktop take. */
function useTakeUrl(take: Recording): string | null {
  const [diskUrl, setDiskUrl] = useState<string | null>(null)

  useEffect(() => {
    if (take.blob) return
    let cancelled = false
    recordingsStore
      .blobFor(take)
      .then((blob) => {
        if (!cancelled) setDiskUrl(urlFor(blob))
      })
      .catch(() => {
        // Leaves the "reading" line in place; the file is missing or unreadable.
      })
    return () => {
      cancelled = true
    }
  }, [take])

  return take.blob ? urlFor(take.blob) : diskUrl
}

/**
 * Chrome's MediaRecorder writes WebM without a duration, so the player shows no length and cannot seek.
 * Seeking far past the end once makes the browser scan the file and fill in the real duration.
 */
function useKnownDuration(audioRef: RefObject<HTMLAudioElement | null>) {
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onFixed = () => {
      if (audio.duration === Infinity) return
      audio.removeEventListener('durationchange', onFixed)
      audio.currentTime = 0
    }
    const onMetadata = () => {
      if (audio.duration !== Infinity) return
      audio.addEventListener('durationchange', onFixed)
      audio.currentTime = 1e101
    }
    if (audio.readyState >= 1) onMetadata()
    audio.addEventListener('loadedmetadata', onMetadata)
    return () => {
      audio.removeEventListener('loadedmetadata', onMetadata)
      audio.removeEventListener('durationchange', onFixed)
    }
  }, [audioRef])
}

/** Mic level bar updated per animation frame, without re-rendering React. */
export function LevelMeter({ getLevel }: { getLevel: () => number }) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    let shown = 0
    const tick = () => {
      shown = Math.max(getLevel(), shown * 0.9)
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown})`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [getLevel])

  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/60" aria-hidden="true">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-[#7ee0a1] via-[#ffb13b] to-[#ef5b4c]"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  )
}
