import { FileDropZone } from './FileDropZone'

const STEPS = [
  { n: '1', title: 'Dosyanı aç', text: 'Guitar Pro dosyasını sürükle ya da seç. Tab ve nota hemen görünür.' },
  { n: '2', title: 'Zarfla loop seç', text: 'Zor bölümün ölçülerinin üzerinden sürükle, kenarlarından ayarla.' },
  { n: '3', title: 'Yavaş başla, hızlan', text: 'Tempoyu düşür, Ayarlar’dan kademeli hızlanmayı aç ve çal.' },
]

export function WelcomeScreen({ onFile }: { onFile: (file: File) => void }) {
  return (
    <div className="grille flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <p className="font-display text-sm font-semibold tracking-[0.3em] text-accent uppercase">Gitar pratik aleti</p>
          <h2 className="mt-2 font-display text-4xl leading-none font-semibold tracking-wide uppercase sm:text-6xl">
            Aç · Loop’a al · Yavaşlat
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Zor bölümü döngüye al, düşük tempoda başla ve her turda biraz hızlanarak çal.
          </p>
        </div>

        <FileDropZone onFile={onFile} />

        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="rounded-xl border border-line bg-surface/85 p-4">
              <div className="flex items-center gap-3">
                <span className="led text-xl font-semibold">{step.n}</span>
                <span className="font-display text-lg font-semibold tracking-wide uppercase">{step.title}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-center text-sm text-muted">
          Klavye kısayolları için{' '}
          <kbd className="rounded border border-line bg-raised px-1.5 font-mono text-xs text-ink">?</kbd> tuşuna bas.
        </p>
      </div>
    </div>
  )
}
