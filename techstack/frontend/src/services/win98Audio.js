/**
 * Authentic Microsoft Windows 98 Sound System
 * Uses bit-for-bit authentic 1998 Microsoft WAV audio samples with instant audio pre-caching
 * and reliable browser autoplay-unlock handling.
 */

const AUDIO_CACHE = {}
let startupPlayedInSession = false

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
 * Handles browser autoplay policy by attaching a one-time interaction listener if initially blocked.
 */
export function playWin98Startup(force = false) {
  if (typeof window === 'undefined') return
  if (startupPlayedInSession && !force) return

  try {
    const audio = getCachedAudio('win98_startup.wav')
    if (audio) {
      audio.volume = 0.85
      const promise = audio.play()
      if (promise !== undefined) {
        promise
          .then(() => {
            startupPlayedInSession = true
            sessionStorage.setItem('win98_startup_sound_played', 'true')
          })
          .catch(() => {
            // Autoplay blocked: wait for first user gesture then trigger startup chime
            const unlockAndPlay = () => {
              if (startupPlayedInSession && !force) return
              const retryAudio = getCachedAudio('win98_startup.wav')
              if (retryAudio) {
                retryAudio.volume = 0.85
                retryAudio.play().then(() => {
                  startupPlayedInSession = true
                  sessionStorage.setItem('win98_startup_sound_played', 'true')
                }).catch(() => {})
              }
              window.removeEventListener('click', unlockAndPlay)
              window.removeEventListener('keydown', unlockAndPlay)
              window.removeEventListener('touchstart', unlockAndPlay)
            }
            window.addEventListener('click', unlockAndPlay, { once: true })
            window.addEventListener('keydown', unlockAndPlay, { once: true })
            window.addEventListener('touchstart', unlockAndPlay, { once: true })
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
 * Play authentic Microsoft Windows 98 Critical Stop / Error Sound
 */
export function playWin98Error() {
  try {
    const audio = getCachedAudio('win98_chord.wav')
    if (audio) {
      audio.volume = 0.8
      const p = audio.play()
      if (p !== undefined) p.catch(() => {})
    }
  } catch (e) {}
}

/**
 * Play authentic Microsoft Windows 98 Shutdown Sound ("LOGON.WAV" / "LOGOFF.WAV")
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

/**
 * Play authentic Microsoft Windows 98 Empty Recycle Bin Sound
 */
export function playWin98Recycle() {
  try {
    const audio = getCachedAudio('win98_recycle.wav')
    if (audio) {
      audio.volume = 0.75
      const p = audio.play()
      if (p !== undefined) p.catch(() => {})
    }
  } catch (e) {}
}
