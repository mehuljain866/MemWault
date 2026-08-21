/**
 * Authentic Microsoft Windows 98 Sound System
 * Uses bit-for-bit authentic 1998 Microsoft WAV audio samples with instant audio pre-caching.
 */

const AUDIO_CACHE = {}

function getCachedAudio(filename) {
  if (typeof window === 'undefined') return null
  if (!AUDIO_CACHE[filename]) {
    const audio = new Audio(`/sounds/${filename}`)
    audio.preload = 'auto'
    AUDIO_CACHE[filename] = audio
  }
  const audio = AUDIO_CACHE[filename]
  try {
    audio.currentTime = 0
  } catch (e) {}
  return audio
}

/**
 * Play authentic Microsoft Windows 98 Startup Chime (Original "The Microsoft Sound.wav")
 */
export function playWin98Startup() {
  try {
    const audio = getCachedAudio('win98_startup.wav')
    if (audio) {
      audio.volume = 0.85
      const promise = audio.play()
      if (promise !== undefined) {
        promise.catch(err => {
          console.warn('Startup audio autoplay blocked by browser policy until interaction:', err)
        })
      }
    }
  } catch (e) {
    console.warn('Audio play error', e)
  }
}

/**
 * Play authentic Microsoft Windows 98 Click / Menu Navigation Sound ("START.WAV")
 */
export function playWin98Click() {
  try {
    const audio = getCachedAudio('win98_start.wav')
    if (audio) {
      audio.volume = 0.7
      const p = audio.play()
      if (p !== undefined) p.catch(() => {})
    }
  } catch (e) {}
}

/**
 * Play authentic Microsoft Windows 98 Window Maximize Sound
 */
export function playWin98Maximize() {
  try {
    const audio = getCachedAudio('win98_notify.wav')
    if (audio) {
      audio.volume = 0.6
      const p = audio.play()
      if (p !== undefined) p.catch(() => {})
    }
  } catch (e) {}
}

/**
 * Play authentic Microsoft Windows 98 Window Minimize Sound
 */
export function playWin98Minimize() {
  try {
    const audio = getCachedAudio('win98_start.wav')
    if (audio) {
      audio.volume = 0.6
      const p = audio.play()
      if (p !== undefined) p.catch(() => {})
    }
  } catch (e) {}
}

/**
 * Play authentic Microsoft Windows 98 Chord Sound ("CHORD.WAV")
 */
export function playWin98Chord() {
  try {
    const audio = getCachedAudio('win98_chord.wav')
    if (audio) {
      audio.volume = 0.75
      const p = audio.play()
      if (p !== undefined) p.catch(() => {})
    }
  } catch (e) {}
}

/**
 * Play authentic Microsoft Windows 98 Asterisk / Ding Sound ("DING.WAV")
 */
export function playWin98Ding() {
  try {
    const audio = getCachedAudio('win98_ding.wav')
    if (audio) {
      audio.volume = 0.75
      const p = audio.play()
      if (p !== undefined) p.catch(() => {})
    }
  } catch (e) {}
}

/**
 * Play authentic Microsoft Windows 98 Shutdown Sound ("LOGOFF.WAV")
 */
export function playWin98Shutdown() {
  try {
    const audio = getCachedAudio('win98_shutdown.wav')
    if (audio) {
      audio.volume = 0.85
      const p = audio.play()
      if (p !== undefined) p.catch(() => {})
    }
  } catch (e) {}
}

// Pre-cache sounds on module load
if (typeof window !== 'undefined') {
  ['win98_startup.wav', 'win98_shutdown.wav', 'win98_chord.wav', 'win98_ding.wav', 'win98_start.wav', 'win98_notify.wav'].forEach(f => {
    try {
      const a = new Audio(`/sounds/${f}`)
      a.preload = 'auto'
      AUDIO_CACHE[f] = a
    } catch (e) {}
  })
}
