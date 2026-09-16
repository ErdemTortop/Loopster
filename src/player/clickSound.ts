/**
 * A punchy woodblock-style metronome click synthesized with Web Audio.
 * alphaTab's built-in click is a thin General MIDI sample whose timbre cannot be changed,
 * so the "tok" sound is generated here and triggered from alphaTab's metronome events.
 *
 * It runs inside alphaTab's own audio context whenever that is available, so the click and the
 * music leave the audio graph on the same clock and through the same output latency.
 */

let context: AudioContext | null = null
/** Our own context, used only until alphaTab's player exists (and on the welcome screen). */
let fallback: AudioContext | null = null
let output: GainNode | null = null
let noise: AudioBuffer | null = null
/** Clicks scheduled ahead of time, so they can be dropped when playback stops. */
let scheduled: { at: number; nodes: AudioScheduledSourceNode[] }[] = []

function build(ctx: AudioContext) {
  // A soft clipper instead of a compressor: a compressor would delay the click by its own lookahead
  // and push it off the beat, while this shapes the peaks without costing a single sample of delay.
  const shaper = ctx.createWaveShaper()
  const curve = new Float32Array(1024)
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 1.4)
  shaper.curve = curve
  shaper.oversample = 'none'
  output = ctx.createGain()
  output.connect(shaper).connect(ctx.destination)

  noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  // Lets the timing tests tap the click signal; the production build has no such hook.
  if (import.meta.env.DEV) Object.assign(window, { __loopsterClick: output })
}

function ensureContext(): AudioContext | null {
  try {
    if (!context) {
      fallback ??= new AudioContext({ latencyHint: 'interactive' })
      context = fallback
      build(context)
    }
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    return null
  }
}

/**
 * Moves the click into alphaTab's audio context. Called once the player is ready; passing null
 * goes back to our own context.
 */
export function setClickContext(ctx: AudioContext | null): void {
  if (ctx === context || (!ctx && context === fallback)) return
  scheduled = []
  output = null
  noise = null
  context = ctx
  if (ctx) {
    try {
      build(ctx)
      // The context we opened before the player existed is not needed any more.
      if (fallback && fallback !== ctx) {
        void fallback.close()
        fallback = null
      }
    } catch {
      context = null
    }
  }
  if (!context) ensureContext()
}

/** Call from a user gesture (e.g. the play button) so the first click is not blocked by autoplay rules. */
export function unlockClick(): void {
  ensureContext()
}

/** Current time of the click context, or null when there is no audio context to use. */
export function clickTime(): number | null {
  return ensureContext()?.currentTime ?? null
}

/** Drops clicks that were scheduled but not played yet, e.g. when playback is paused. */
export function cancelClicks(): void {
  for (const entry of scheduled) {
    for (const node of entry.nodes) {
      try {
        node.stop()
      } catch {
        // Already finished.
      }
    }
  }
  scheduled = []
}

/**
 * Plays one click, at `when` on the click context's clock, or right away when `when` has passed.
 * @param volume 0..1 from the metronome volume slider
 * @param accent true on the first beat of the bar
 */
export function playClick(volume: number, accent: boolean, when?: number): void {
  const ctx = ensureContext()
  if (!ctx || !output || !noise || volume <= 0) return
  const t = when !== undefined && when > ctx.currentTime ? when : ctx.currentTime
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

  scheduled = scheduled.filter((entry) => entry.at > ctx.currentTime)
  scheduled.push({ at: t, nodes: [knock, thump, burst] })
}
