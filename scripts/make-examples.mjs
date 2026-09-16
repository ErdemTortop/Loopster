// Writes the example exercise opened by "Try the example" and by the web demo, in both interface
// languages. The exercise is an original A minor pentatonic pattern.
// Run with: node scripts/make-examples.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))
const alphaTab = require('@coderline/alphatab')

const up = '5.6.16 8.6.16 5.5.16 7.5.16 5.4.16 7.4.16 5.3.16 7.3.16 5.2.16 8.2.16 5.1.16 8.1.16 5.1.8 8.1.8 |'
const down = '8.1.16 5.1.16 8.2.16 5.2.16 7.3.16 5.3.16 7.4.16 5.4.16 7.5.16 5.5.16 8.6.16 5.6.16 5.6.4 |'
const eighths = '5.6.8 8.6.8 5.5.8 7.5.8 5.4.8 7.4.8 5.3.8 7.3.8 |'
const eighthsDown = '7.3.8 5.3.8 7.4.8 5.4.8 7.5.8 5.5.8 8.6.8 5.6.8 |'
const phrase = eighths + eighthsDown + up + down
const bassBar = '0.3.4 0.3.4 3.3.4 5.3.4 |'

const examples = [
  { lang: 'tr', title: 'A Minör Pentatonik', artist: 'Loopster örneği', guitar: 'Gitar', bass: 'Bas' },
  { lang: 'en', title: 'A Minor Pentatonic', artist: 'Loopster example', guitar: 'Guitar', bass: 'Bass' },
]

const outDir = join(root, 'public', 'examples')
mkdirSync(outDir, { recursive: true })

for (const example of examples) {
  const tex = [
    `\\title "${example.title}"`,
    `\\artist "${example.artist}"`,
    '\\tempo 96',
    '.',
    `\\track "${example.guitar}"`,
    phrase.repeat(6),
    `\\track "${example.bass}"`,
    '\\instrument 33',
    '\\tuning g2 d2 a1 e1',
    bassBar.repeat(24),
  ].join('\n')
  const score = alphaTab.importer.ScoreLoader.loadAlphaTex(tex)
  const bytes = new alphaTab.exporter.Gp7Exporter().export(score)
  const file = join(outDir, `pentatonic-${example.lang}.gp`)
  writeFileSync(file, bytes)
  console.log(`${file}: "${score.title}", ${score.masterBars.length} bars, ${bytes.length} bytes`)
}
