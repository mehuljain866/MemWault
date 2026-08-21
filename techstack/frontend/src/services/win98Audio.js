/**
 * Authentic Windows 98 Sound System
 * Pure Web Audio API Synthesizer - 0 external asset latency or broken URLs.
 */

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (AudioContext) {
      audioCtx = new AudioContext()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Play authentic Windows 98 Startup Chime (Lush 90s polyphonic pad & chord)
 */
export function playWin98Startup() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  // Chord: Ambient E-major / A-maj9 foundation
  const frequencies = [
    { freq: 164.81, time: 0.0, dur: 4.5, gain: 0.25, type: 'sawtooth' }, // E3
    { freq: 220.00, time: 0.1, dur: 4.5, gain: 0.30, type: 'sine' },     // A3
    { freq: 277.18, time: 0.2, dur: 4.2, gain: 0.35, type: 'sine' },     // C#4
    { freq: 329.63, time: 0.3, dur: 4.0, gain: 0.30, type: 'triangle' }, // E4
    { freq: 440.00, time: 0.6, dur: 3.8, gain: 0.35, type: 'sine' },     // A4
    { freq: 554.37, time: 0.9, dur: 3.5, gain: 0.35, type: 'sine' },     // C#5
    { freq: 659.25, time: 1.2, dur: 3.2, gain: 0.40, type: 'sine' },     // E5
    { freq: 880.00, time: 1.5, dur: 2.8, gain: 0.25, type: 'sine' },     // A5
    { freq: 1108.73, time: 1.8, dur: 2.5, gain: 0.18, type: 'sine' },    // C#6
  ]

  frequencies.forEach(note => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = note.type
    osc.frequency.setValueAtTime(note.freq, now + note.time)

    // Warm vintage lowpass filter
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2400, now + note.time)
    filter.frequency.exponentialRampToValueAtTime(800, now + note.time + note.dur)

    // Smooth envelope with ethereal decay
    gain.gain.setValueAtTime(0.0001, now + note.time)
    gain.gain.exponentialRampToValueAtTime(note.gain * 0.4, now + note.time + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.dur)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + note.time)
    osc.stop(now + note.time + note.dur)
  })
}

/**
 * Play standard Windows 98 Navigation Click
 */
export function playWin98Click() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'triangle'
  osc.frequency.setValueAtTime(1400, now)
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.02)

  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.025)
}

/**
 * Play Windows 98 Window Maximize / Open Sound
 */
export function playWin98Maximize() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(320, now)
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.08)

  gain.gain.setValueAtTime(0.15, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.08)
}

/**
 * Play Windows 98 Window Minimize / Close Sound
 */
export function playWin98Minimize() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.08)

  gain.gain.setValueAtTime(0.15, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.08)
}

/**
 * Play Windows 98 Chord / Asterisk Dialog Sound (The Ding)
 */
export function playWin98Chord() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 major chord

  notes.forEach((freq) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.6)
  })
}

/**
 * Play Windows 98 Shutdown Chime
 */
export function playWin98Shutdown() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const notes = [
    { freq: 880.00, time: 0.0, dur: 0.8 },
    { freq: 659.25, time: 0.3, dur: 0.9 },
    { freq: 554.37, time: 0.6, dur: 1.1 },
    { freq: 440.00, time: 0.9, dur: 1.5 },
  ]

  notes.forEach(n => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(n.freq, now + n.time)

    gain.gain.setValueAtTime(0.2, now + n.time)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + n.time)
    osc.stop(now + n.time + n.dur)
  })
}
