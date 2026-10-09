import { IS_TOUCH } from './touch.js';

// Graphics settings. Presets for quick picks, each option tweakable, kept in
// this browser. Phones start on Medium (Low is there if they get hot).

const KEY = 'fossicking-settings-v1';

export const PRESETS = {
  low: { res: 0.75, shadows: 'off', aa: false, gems: 'simple', reflections: 'static' },
  medium: { res: 1, shadows: 'low', aa: false, gems: 'inventory', reflections: 'slow' },
  high: { res: 1.5, shadows: 'high', aa: true, gems: 'full', reflections: 'live' },
  ultra: { res: 2, shadows: 'ultra', aa: true, gems: 'full', reflections: 'live' },
};

export const OPTIONS = {
  res: { label: 'Resolution', note: 'The biggest one for speed. Lower looks softer.', choices: [[0.6, 'Very low'], [0.75, 'Low'], [1, 'Normal'], [1.5, 'Sharp'], [2, 'Full (retina)']] },
  shadows: { label: 'Shadows', note: 'Sun shadows from trees, rocks and you.', choices: [['off', 'Off'], ['low', 'Low'], ['high', 'High'], ['ultra', 'Ultra']] },
  aa: { label: 'Smooth edges', note: 'Antialiasing. Restarts the game to change.', choices: [[false, 'Off'], [true, 'On']] },
  gems: { label: 'Gems and crystals', note: 'See-through, light-bending stones. Costs an extra render when one is on screen.', choices: [['simple', 'Simple'], ['inventory', 'Realistic in inventory'], ['full', 'Realistic everywhere']] },
  reflections: { label: 'Reflections', note: 'How often the sky and ground reflected in gold, water and gems are refreshed.', choices: [['static', 'Hourly'], ['slow', 'Every few seconds'], ['live', 'Live']] },
  fps: { label: 'Show frame rate', note: 'Handy for finding the right settings.', choices: [[false, 'Off'], [true, 'On']] },
};

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.preset) return s;
  } catch { /* fall through to defaults */ }
  return null;
}

const stored = load();
export const settings = stored || { preset: IS_TOUCH ? 'medium' : 'high', ...PRESETS[IS_TOUCH ? 'medium' : 'high'], fps: false, warned: false };
// Fill anything a newer version added.
for (const [k, v] of Object.entries(PRESETS.high)) if (settings[k] === undefined) settings[k] = v;
export const firstRun = !stored;

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage blocked: still applies this session */ }
}

// Does this preset match every option? (Otherwise it's "Custom".)
export function matchingPreset() {
  for (const [name, p] of Object.entries(PRESETS)) if (Object.entries(p).every(([k, v]) => settings[k] === v)) return name;
  return 'custom';
}

// Realistic (transmissive) gem materials here?
export const gemsRealistic = (where) => settings.gems === 'full' || (settings.gems === 'inventory' && where === 'inventory');
