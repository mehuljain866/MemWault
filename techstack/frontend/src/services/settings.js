const SETTINGS_KEY = 'memwault_settings';

const DEFAULT_SETTINGS = {
  autoplayDelay: 0, // 0 = instant, -1 = disabled, >0 = seconds delay
  preferredMusicApp: 'spotify', // 'spotify', 'apple', 'youtube', 'amazon'
  skipDuration: 5, // 3, 4, 5
  mapMode: 'immersive', // 'immersive' or 'split'
  theme: 'dark', // 'dark' or 'light'
  
  // Meaning-Making Editor Settings
  editorSplitPane: false,
  editorStyle: 'docs', // 'docs' or 'invisible'
  editorRibbonMode: 'simple', // 'simple' or 'advanced'
  editorCustomTools: [], // array of command names like ['image', 'code']
  
  // Tag visibility
  showAITags: true,
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
