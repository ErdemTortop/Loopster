/**
 * A punchy woodblock-style metronome click synthesized with Web Audio.
 * alphaTab's built-in click is a thin General MIDI sample whose timbre cannot be changed,
 * so the "tok" sound is generated here and triggered from alphaTab's metronome events.
 */

let context: AudioContext | null = null
let output: GainNode | null = null
let noise: AudioBuffer | null = null

function ensureContext(): AudioContext | null {
  try {
    if (!context) {
      context = new AudioContext({ latencyHint: 'interactive' })
      // A compressor keeps loud accented clicks from clipping.
      const compressor = context.createDynamicsCompressor()
      compressor.threshold.value = -10
      compressor.ratio.value = 6
      compressor.attack.value = 0.001
      compressor.release.value = 0.08
      output = context.createGain()
      output.connect(compressor).connect(context.destination)

      noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.03), context.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    }
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    return null
  }
}

/** Call from a user gesture (e.g. the play button) so the first click is not blocked by autoplay rules. */
export function unlockClick(): void {
  ensureContext()
}

/**
 * Plays one click now.
 * @param volume 0..1 from the metronome volume slider
 * @param accent true on the first beat of the bar
 */
export function playClick(volume: number, accent: boolean): void {
  const ctx = ensureContext()
  if (!ctx || !output || !noise || volume <= 0) return
  const t = ctx.currentTime
  const peak = Math.min(1, volume) * (accent ? 1 : 0.75)

  // Body: a short pitched knock that drops quickly, like a woodblock.
  const knock = ctx.createOscillator()
  knock.type = 'triangle'
  knock.frequency.setValueAtTime(accent ? 1250 : 900, t)
  knock.frequency.exponentialRampToValueAtTime(accent ? 700 : 520, t + 0.04)
  const knockGain = ctx.createGain()
  knockGain.gain.setValueAtTime(0.0001, t)
  knockGain.gain.exponentialRampToValueAtTime(peak, t + 0.002)
  knockGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11)
  knock.connect(knockGain).connect(output)

  // Weight: a low thump underneath so it cuts through a guitar amp.
  const thump = ctx.createOscillator()
  thump.type = 'sine'
  thump.frequency.setValueAtTime(accent ? 180 : 150, t)
  thump.frequency.exponentialRampToValueAtTime(70, t + 0.06)
  const thumpGain = ctx.createGain()
  thumpGain.gain.setValueAtTime(0.0001, t)
  thumpGain.gain.exponentialRampToValueAtTime(peak * 0.9, t + 0.003)
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  thump.connect(thumpGain).connect(output)

  // Attack: a very short filtered noise burst gives the click its crisp edge.
  const burst = ctx.createBufferSource()
  burst.buffer = noise
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = accent ? 3200 : 2600
  band.Q.value = 1.2
  const burstGain = ctx.createGain()
  burstGain.gain.setValueAtTime(peak * 0.8, t)
  burstGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02)
  burst.connect(band).connect(burstGain).connect(output)

  knock.start(t)
  knock.stop(t + 0.12)
  thump.start(t)
  thump.stop(t + 0.1)
  burst.start(t)
  burst.stop(t + 0.03)
}
