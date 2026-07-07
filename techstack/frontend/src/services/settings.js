const SETTINGS_KEY = 'memwault_settings';

const DEFAULT_SETTINGS = {
  autoplayDelay: 0, // 0 = instant, -1 = disabled, >0 = seconds delay
  preferredMusicApp: 'spotify', // 'spotify', 'apple', 'youtube', 'amazon'
};

export function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.error('Failed to parse settings', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
