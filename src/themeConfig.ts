// Theme Configuration System for Redditionaire
// Allows mods to customize the game's appearance through Reddit settings

import { createTheme, ThemeConfig, COLORS } from './theme.js';

// Default theme values that can be overridden by mods
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  accentColor: COLORS.PRIMARY,
  cardBackground: COLORS.NEUTRAL_100,
  primaryColor: COLORS.SECONDARY,
  textColor: COLORS.NEUTRAL_900,
};

// Theme configuration keys that mods can set
export const THEME_SETTINGS_KEYS = {
  ACCENT_COLOR: 'accent_color',
  CARD_BACKGROUND: 'card_background',
  PRIMARY_COLOR: 'primary_color',
  TEXT_COLOR: 'text_color',
  ENABLE_CUSTOM_THEME: 'enable_custom_theme',
} as const;

// Validate hex color format
export const isValidHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

// Validate and sanitize theme configuration
export const validateThemeConfig = (config: Partial<ThemeConfig>): Partial<ThemeConfig> => {
  const validated: Partial<ThemeConfig> = {};
  
  if (config.accentColor && isValidHexColor(config.accentColor)) {
    validated.accentColor = config.accentColor;
  }
  
  if (config.cardBackground && isValidHexColor(config.cardBackground)) {
    validated.cardBackground = config.cardBackground;
  }
  
  if (config.primaryColor && isValidHexColor(config.primaryColor)) {
    validated.primaryColor = config.primaryColor;
  }
  
  if (config.textColor && isValidHexColor(config.textColor)) {
    validated.textColor = config.textColor;
  }
  
  return validated;
};

// Get theme configuration from Reddit settings
export const getThemeFromSettings = async (context: any): Promise<ThemeConfig> => {
  try {
    // Check if custom theme is enabled
    const enableCustomTheme = await context.settings.get(THEME_SETTINGS_KEYS.ENABLE_CUSTOM_THEME);
    
    if (!enableCustomTheme) {
      return DEFAULT_THEME_CONFIG;
    }
    
    // Get custom theme values
    const customTheme: Partial<ThemeConfig> = {};
    
    const accentColor = await context.settings.get(THEME_SETTINGS_KEYS.ACCENT_COLOR);
    if (accentColor) customTheme.accentColor = accentColor;
    
    const cardBackground = await context.settings.get(THEME_SETTINGS_KEYS.CARD_BACKGROUND);
    if (cardBackground) customTheme.cardBackground = cardBackground;
    
    const primaryColor = await context.settings.get(THEME_SETTINGS_KEYS.PRIMARY_COLOR);
    if (primaryColor) customTheme.primaryColor = primaryColor;
    
    const textColor = await context.settings.get(THEME_SETTINGS_KEYS.TEXT_COLOR);
    if (textColor) customTheme.textColor = textColor;
    
    // Validate and merge with defaults
    const validatedTheme = validateThemeConfig(customTheme);
    return createTheme(validatedTheme);
    
  } catch (error) {
    console.warn('Error loading theme configuration, using defaults:', error);
    return DEFAULT_THEME_CONFIG;
  }
};

// Theme presets for quick customization
export const THEME_PRESETS = {
  CLASSIC: {
    name: 'Classic Game Show',
    description: 'Traditional golden game show theme',
    config: {
      accentColor: '#FFD700',
      cardBackground: '#FFFFFF',
      primaryColor: '#1E3A8A',
      textColor: '#1E293B',
    }
  },
  MODERN: {
    name: 'Modern Dark',
    description: 'Contemporary dark theme',
    config: {
      accentColor: '#3B82F6',
      cardBackground: '#1E293B',
      primaryColor: '#10B981',
      textColor: '#F8FAFC',
    }
  },
  VINTAGE: {
    name: 'Vintage Retro',
    description: 'Retro 70s game show style',
    config: {
      accentColor: '#FF6B6B',
      cardBackground: '#FFF8DC',
      primaryColor: '#8B4513',
      textColor: '#654321',
    }
  },
  NEON: {
    name: 'Neon Cyberpunk',
    description: 'Bright neon cyberpunk theme',
    config: {
      accentColor: '#00FF88',
      cardBackground: '#0A0A0A',
      primaryColor: '#FF0080',
      textColor: '#FFFFFF',
    }
  },
} as const;

// Apply theme preset
export const applyThemePreset = (presetName: keyof typeof THEME_PRESETS): ThemeConfig => {
  const preset = THEME_PRESETS[presetName];
  if (!preset) {
    console.warn(`Unknown theme preset: ${presetName}, using default`);
    return DEFAULT_THEME_CONFIG;
  }
  
  return createTheme(preset.config);
};

// Export theme configuration for use in main app
export { createTheme } from './theme.js';
export type { ThemeConfig } from './theme.js';
