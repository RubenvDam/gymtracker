let ctx: AudioContext | null = null

/** Call from a tap handler: iOS only lets audio start after a user gesture. */
export function primeAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* audio unsupported: the visual timer still works */
  }
}

export function beep() {
  try {
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.15
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
  } catch {
    /* ignore */
  }
}
