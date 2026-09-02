import { AppSettings } from '../types.js';

const SETTINGS_STORAGE_KEY = 'divitask_global_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  yearMode: 'quarter',
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY) ?? localStorage.getItem('dynagantt_global_settings');
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      yearMode: parsed.yearMode === 'term' ? 'term' : 'quarter',
      workingHoursStart: typeof parsed.workingHoursStart === 'string' ? parsed.workingHoursStart : '09:00',
      workingHoursEnd: typeof parsed.workingHoursEnd === 'string' ? parsed.workingHoursEnd : '17:00',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}
