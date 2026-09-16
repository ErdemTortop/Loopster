import { useI18n } from '../i18n'
import { FileDropZone } from './FileDropZone'
import { Button } from './ui'

interface Props {
  onFile: (file: File) => void
  onExample: () => void
}

export function WelcomeScreen({ onFile, onExample }: Props) {
  const { t } = useI18n()

  return (
    <div className="grille flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <p className="font-display text-sm font-semibold tracking-[0.3em] text-accent uppercase">{t.welcome.kicker}</p>
          <h2 className="mt-2 font-display text-4xl leading-none font-semibold tracking-wide uppercase sm:text-6xl">
            {t.welcome.headline}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">{t.welcome.intro}</p>
        </div>

        <FileDropZone onFile={onFile} />
        <div className="mt-4 flex justify-center">
          <Button onClick={onExample}>{t.welcome.tryExample}</Button>
        </div>

        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {t.welcome.steps.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-line bg-surface/85 p-4">
              <div className="flex items-center gap-3">
                <span className="led text-xl font-semibold">{i + 1}</span>
                <span className="font-display text-lg font-semibold tracking-wide uppercase">{step.title}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-center text-sm text-muted">
          {t.welcome.shortcutsBefore}{' '}
          <kbd className="rounded border border-line bg-raised px-1.5 font-mono text-xs text-ink">?</kbd>{' '}
          {t.welcome.shortcutsAfter}
        </p>
      </div>
    </div>
  )
}
