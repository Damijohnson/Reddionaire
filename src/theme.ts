// Game Show Theme System
// Professional styling tokens for Redditionaire

export const COLORS = {
  // Brand Colors
  BACKGROUND: '#6B5ECD', // Main purple background
  PRIMARY: '#3CCFCF', // Light blue for Start Game button
  PRIMARY_DARK: '#35B9B9', // Darker blue for hover states
  PRIMARY_LIGHT: '#4DDBDB', // Lighter blue for highlights
  
  // Action Colors
  SECONDARY: '#FF69B4', // Pink for Leaderboard button
  ACCENT: '#FFD700', // Yellow for How to Play button
  
  // Status Colors
  SUCCESS: '#10B981', // Green for correct answers
  ERROR: '#EF4444', // Red for wrong answers
  
  // Neutral Colors
  NEUTRAL_100: '#FFFFFF', // Pure white
  NEUTRAL_200: '#F8FAFC', // Very light gray
  NEUTRAL_300: '#E2E8F0', // Light gray
  NEUTRAL_400: '#CBD5E1', // Medium gray
  NEUTRAL_500: '#94A3B8', // Gray
  NEUTRAL_600: '#64748B', // Dark gray
  NEUTRAL_700: '#475569', // Darker gray
  NEUTRAL_800: '#334155', // Very dark gray
  NEUTRAL_900: '#1E293B', // Almost black
  
  // Game Show Specific Colors
  MONEY_GREEN: '#059669', // Money ladder color
  MILESTONE_BLUE: '#3B82F6', // Milestone indicators
  LIFELINE_ORANGE: '#F97316', // Lifeline buttons
  AUDIENCE_YELLOW: '#F59E0B', // Audience results
  EXPLANATION_BLUE: '#DBEAFE', // Explanation backgrounds
};

export const SPACING = {
  XS: '4px',
  SM: '8px',
  MD: '16px',
  LG: '24px',
  XL: '32px',
  XXL: '48px',
};

export const RADIUS = {
  SM: '4px',
  MD: '8px',
  LG: '12px',
  XL: '16px',
  ROUND: '50%',
};

export const TYPOGRAPHY = {
  SIZES: {
    XS: '12px',
    SM: '14px',
    MD: '16px',
    LG: '18px',
    XL: '24px',
    XXL: '32px',
    XXXL: '48px',
  },
  WEIGHTS: {
    NORMAL: 'normal',
    MEDIUM: '500',
    SEMIBOLD: '600',
    BOLD: '700',
    EXTRABOLD: '800',
  },
};

export const SHADOWS = {
  SM: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  MD: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  LG: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  XL: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  GOLD: '0 4px 14px 0 rgba(255, 215, 0, 0.3)',
  GLOW: '0 0 20px rgba(255, 215, 0, 0.5)',
};

export const ANIMATIONS = {
  DURATION: {
    FAST: '150ms',
    NORMAL: '300ms',
    SLOW: '500ms',
  },
  EASING: {
    EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
    EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

// Game Show Specific Theme Values
export const BUTTONS = {
  // Common button styles
  BASE: {
    WIDTH: 100,
    HEIGHT: 40,
    CORNER_RADIUS: "small" as const,
    ALIGNMENT: "middle center" as const,
    TEXT_SIZE: "large" as const
  },
  
  // Start Game button
  PRIMARY: {
    BACKGROUND: COLORS.PRIMARY,
    TEXT: COLORS.NEUTRAL_100
  },

  // Leaderboard button
  SECONDARY: {
    BACKGROUND: COLORS.SECONDARY,
    TEXT: COLORS.NEUTRAL_100,
    ICON: {
      TYPE: "🪙",
      GAP: "small" as const
    }
  },

  // How to Play button
  ACCENT: {
    BACKGROUND: COLORS.ACCENT,
    TEXT: COLORS.NEUTRAL_900
  }
};

export const GAME_SHOW = {
  QUESTION_CARD: {
    BACKGROUND: COLORS.NEUTRAL_100,
    BORDER: `2px solid ${COLORS.PRIMARY}`,
    SHADOW: SHADOWS.GOLD,
  },
  MONEY_LADDER: {
    ACTIVE_COLOR: COLORS.PRIMARY,
    COMPLETED_COLOR: COLORS.SUCCESS,
    UPCOMING_COLOR: COLORS.NEUTRAL_400,
    MILESTONE_COLOR: COLORS.MILESTONE_BLUE,
  },
  LIFELINES: {
    AVAILABLE_COLOR: COLORS.LIFELINE_ORANGE,
    USED_COLOR: COLORS.NEUTRAL_400,
    HOVER_COLOR: COLORS.LIFELINE_ORANGE,
  },
  ANSWERS: {
    CORRECT_COLOR: COLORS.SUCCESS,
    WRONG_COLOR: COLORS.ERROR,
    DISABLED_COLOR: COLORS.NEUTRAL_300,
  },
};
