const SETTINGS_KEY = 'memwault_settings';

const DEFAULT_SETTINGS = {
  autoplay: true, // Auto-play video when opened
  loopVideo: true, // Loop video continuously
  autoplayDelay: 0, // 0 = instant, -1 = disabled, >0 = seconds delay
  preferredMusicApp: 'spotify', // 'spotify', 'apple', 'youtube', 'amazon'
  skipDuration: 5, // 3, 4, 5
  mapMode: 'immersive', // 'immersive' or 'split'
  theme: 'dark', // 'dark' or 'light'
  designPhilosophy: 'modern', // 'modern' (Flat/Glass) or 'skeuomorphic' (Archival Vault & Paper)
  
  // Meaning-Making Editor Settings
  editorSplitPane: false,
  editorStyle: 'docs', // 'modern', 'docs', or 'invisible'
  editorRibbonMode: 'simple', // 'simple' or 'advanced'
  editorCustomTools: [], // array of command names like ['image', 'code']
  
  // Tag visibility
  showAITags: true,
};

export function applyThemeSettings(settings) {
  const current = settings || getSettings();
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', current.theme || 'dark');
    document.documentElement.setAttribute('data-design', current.designPhilosophy || 'modern');
  }
}

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
