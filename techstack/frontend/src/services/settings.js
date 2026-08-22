const SETTINGS_KEY = 'memwault_settings';

export const THEME_CATALOG = [
  // ── Material Worlds ──
  { id: 'darkroom', name: 'Darkroom', category: 'material', tagline: 'Safe-light amber & photographic developer fluid', accent: '#E05A36', base: '#0E0C0C', hasVinyl: true },
  { id: 'vault-classic', name: 'Vault Classic', category: 'material', tagline: 'The original tactile brass & archival vault', accent: '#E89E38', base: '#181818', hasVinyl: true },
  { id: 'field-notes', name: 'Field Notes', category: 'material', tagline: 'Pocketbook linen, pressed graphite & kraft paper', accent: '#C87D43', base: '#1E1B18', hasVinyl: true },
  { id: 'observatory', name: 'Observatory', category: 'material', tagline: 'Polished astrolabes beneath midnight indigo', accent: '#E2B858', base: '#0B101B', hasVinyl: true },
  { id: 'cabinet-1974', name: 'Cabinet 1974', category: 'material', tagline: 'Heavy steel drawers, manila tabs & typewriter ribbon', accent: '#B85D43', base: '#171A19', hasVinyl: true },
  { id: 'scriptorium', name: 'Scriptorium', category: 'material', tagline: 'Vellum manuscripts, iron-gall ink & candlelit oak', accent: '#962828', base: '#181310', hasVinyl: true },
  { id: 'mid-century', name: 'Mid-Century', category: 'material', tagline: 'Danish teak plinth, emerald velvet & hi-fi console', accent: '#D4AF37', base: '#131B16', hasVinyl: true },
  { id: 'monolith', name: 'Monolith', category: 'material', tagline: 'Anthracite slate, titanium precision & stark contrast', accent: '#A0A5B5', base: '#121214', hasVinyl: false },
  { id: 'polaroid', name: 'Polaroid', category: 'material', tagline: 'Faded instant film emulsion & white card borders', accent: '#66A8A6', base: '#1E2022', hasVinyl: false },
  { id: 'basic', name: 'Basic', category: 'material', tagline: 'Clean, distraction-free neutral flat interface', accent: '#007AFF', base: '#000000', hasVinyl: false },

  // ── Design Eras ──
  { id: 'win98', name: "System Vault '98", category: 'era', era: '1998', tagline: 'Windows 98 OS window chrome, 3D bevels & .exe shell', accent: '#000080', base: '#C0C0C0', hasVinyl: false },
  { id: 'y2k', name: 'Chrome Cyber', category: 'era', era: '2001', tagline: 'Brushed alloy chassis, liquid chrome, ice plastic & VFD', accent: '#00F0FF', base: '#06080F', hasVinyl: false },
  { id: 'aqua', name: 'Aqua Dream', category: 'era', era: '2002', tagline: 'Mac OS X pinstripes, gel-cap buttons & traffic lights', accent: '#388BFD', base: '#ECEFF4', hasVinyl: false },
  { id: 'ios7', name: 'Thin Air', category: 'era', era: '2013', tagline: 'Ultra-thin typography, borderless actions & frosted blur', accent: '#007AFF', base: '#EFEFF4', hasVinyl: false },
  { id: 'material', name: 'Quantum Paper', category: 'era', era: '2014', tagline: 'Google Material elevation shadows, FAB & quantum ink', accent: '#3F51B5', base: '#ECEFF1', hasVinyl: false },
  { id: 'insta2016', name: 'Gradient Season', category: 'era', era: '2016', tagline: 'Sunset multi-stop gradients & Stripe card lift', accent: '#E1306C', base: '#F8F9FB', hasVinyl: false },
  { id: 'neumorphic', name: 'Soft Clay', category: 'era', era: '2019', tagline: 'Continuous extruded clay surfaces & opposing shadows', accent: '#635BFF', base: '#E0E5EC', hasVinyl: false },
];

const DEFAULT_SETTINGS = {
  autoplay: true,
  timelineAutoplayVideo: true, // auto-play video thumbnails in /timeline memories view
  loopVideo: true,
  autoplayDelay: 0,
  preferredMusicApp: 'spotify',
  skipDuration: 5,
  mapMode: 'immersive',
  
  // Theme & Visual Identity
  theme: 'dark', // 'dark' | 'light'
  themeId: 'darkroom', // default canonical theme
  designPhilosophy: 'skeuomorphic', // legacy fallback
  grainIntensity: 0.05, // 0.0 to 0.15 (SVG noise overlay)
  patinaLevel: 0.3, // 0.0 to 0.8 (vignette & age)
  hardwareAccent: 'amber', // 'amber' | 'copper' | 'steel' | 'gold'
  crtMode: false, // toggle retro scanlines/flicker
  
  // Editor Settings
  editorSplitPane: false,
  editorStyle: 'docs',
  editorRibbonMode: 'simple',
  editorCustomTools: [],
  
  // Visibility
  showAITags: true,
  win98ShowToolbar: true,

  // Windows 98 Specific Paradigm Settings
  win98DashboardMode: 'dashboard', // 'dashboard' | 'widget'
  win98Wallpaper: null, // Custom image URL/base64 or null for classic teal
  win98WallpaperMode: 'stretch', // 'stretch' | 'tile' | 'center'
  win98IconBackdrop: false, // true = show retro beveled backdrop boxes behind desktop icons
  win98WidgetVisibility: {
    memoryCounter: true,
    statGrid: true,
    quickActions: true,
    systemHealth: true,
    auditLog: true,
  },
  win98WidgetPositions: {},
  win98SoundEnabled: true,
  win98BootScreen: true,
  enableClippy: true, // true = show floating Clippy Assistant in bottom-right corner
  customQRCodes: true, // true = styled era frames & dots, false = classic high-contrast B&W
};

export function applyThemeSettings(settings) {
  const current = settings || getSettings();
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const theme = current.theme || 'dark';
    const themeId = current.themeId || (current.designPhilosophy === 'skeuomorphic' ? 'vault-classic' : (current.designPhilosophy === 'modern' ? 'basic' : 'darkroom'));

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-id', themeId);
    
    // Set fallback data-design for backward compatibility with existing utility selectors
    const isFlatModern = (themeId === 'basic' || themeId === 'ios7' || themeId === 'material' || themeId === 'insta2016');
    root.setAttribute('data-design', isFlatModern ? 'modern' : 'skeuomorphic');

    // Dynamic numeric tokens
    if (current.grainIntensity !== undefined) {
      root.style.setProperty('--mat-grain-opacity', current.grainIntensity);
    }
    if (current.patinaLevel !== undefined) {
      root.style.setProperty('--mat-patina-opacity', current.patinaLevel);
    }

    if (current.crtMode) {
      root.setAttribute('data-crt', 'true');
    } else {
      root.removeAttribute('data-crt');
    }
  }
}

export function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old designPhilosophy setting if themeId not set
      if (!parsed.themeId && parsed.designPhilosophy) {
        parsed.themeId = parsed.designPhilosophy === 'skeuomorphic' ? 'vault-classic' : 'basic';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to parse settings', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('memwault-settings-changed'));
  }
}

