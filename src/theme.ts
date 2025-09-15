// Game Show Theme System
// Professional styling tokens for Redditionaire

export const COLORS = {
  // Brand Colors
  background: '#5A4FCC', // Main purple background
  primary: '#37BDF9', // Light blue for Start Game button
  secondary: '#E979FA', // Pink for Leaderboard button
  accent: '#F9CC13', // Yellow for How to Play button

  // Game Colors
  QUESTION_HEADER: '#8E68F0', // Updated purple badge
  questionBackground: '#F2D6FF', // Updated lighter purple background
  QUESTION_TEXT: '#3F2C90', // New: dark purple question text
  ANSWER_BUTTON: '#5B4FD6', // Updated answer button purple
  ANSWER_TEXT: '#FFFFFF', // White text for answers
  LIFELINE_50_50: '#3CCFCF', // Blue 50:50 button
  LIFELINE_ASK: '#FFD700', // Yellow Ask button
  LIFELINE_CALL: '#FF69B4', // Pink Call button
  MONEY_LADDER_BG: '#5449C8', // Purple money ladder background
  MILESTONE_COLOR: '#FFD700', // Yellow milestone indicator
  
  // Status Colors
  SUCCESS: '#10B981', // Green for correct answers
  ERROR: '#EF4444', // Red for wrong answers
  
  // Neutral Colors
  NEUTRAL_100: '#FFFFFF', // Pure white
  NEUTRAL_400: '#CBD5E1', // Medium gray
  NEUTRAL_700: '#475569',
  NEUTRAL_900: '#1E293B', // Almost black
  
};

export const typography = {
  paragraph: {
    textSize: "small" as const,
  },
  heading1: {
    textSize: "xlarge" as const,
    textWeight: "bold" as const
  },
  heading2: {
    textSize: "large" as const,
    textWeight: "bold" as const
  },
  heading3: {
    textSize: "medium" as const,
    textWeight: "bold" as const
  },
};

// Game Show Specific Theme Values
export const BUTTONS = {
  // Common button styles
  base: {
    width: 100,
    height: 50,
    cornerRadius: "small" as const,
    alignment: "middle center" as const,
    textSize: "medium" as const,
    textWeight: "bold" as const
  },
  
  // Start Game button
  primary: {
    background: COLORS.primary,
    text: COLORS.NEUTRAL_100
  },

  // Leaderboard button
  secondary: {
    background: COLORS.secondary,
    text: COLORS.NEUTRAL_100,
    icon: {
      gap: "small" as const
    }
  },

  // How to Play button
  accent: {
    background: COLORS.accent,
    text: COLORS.NEUTRAL_100
  }
};

export const GAME_UI = {
  QUESTION: {
    CONTAINER: {
      PADDING: "medium" as const,
      CORNER_RADIUS: "small" as const,
      BACKGROUND: COLORS.questionBackground
    },
    HEADER: {
      WIDTH: 140,
      BACKGROUND: COLORS.secondary,
      TEXT_COLOR: COLORS.NEUTRAL_100,
      PADDING: "small" as const,
      CORNER_RADIUS: "small" as const
    }
  },
  ANSWERS: {
    BUTTON: {
      HEIGHT: 52,
      PADDING: "small" as const,
      CORNER_RADIUS: "small" as const,
      BACKGROUND: COLORS.ANSWER_BUTTON,
      TEXT_COLOR: COLORS.ANSWER_TEXT,
      GAP: "small" as const,
      PREFIX: {
        WIDTH: 40,
        WEIGHT: "bold" as const
      }
    }
  },
  LIFELINES: {
    BUTTON: {
      HEIGHT: 40,
      WIDTH: 100,
      CORNER_RADIUS: "small" as const,
      GAP: "small" as const
    }
  },
  MONEY_LADDER: {
    HEADER: {
      COLOR: COLORS.NEUTRAL_100,
      SIZE: "small" as const,
      WEIGHT: "bold" as const
    },
    CONTAINER: {
      PADDING: "none" as const,
      CORNER_RADIUS: "large" as const,
      BACKGROUND: COLORS.MONEY_LADDER_BG
    },
    MILESTONE: {
      COLOR: COLORS.MILESTONE_COLOR,
      SIZE: 8
    }
  }
};

export const page = {
  header: {
    title: {
      container: 90,
      width: 175,
      height: 30,
    },
    close: {
      container: 10,
      width: 25,
      height: 25,
    }
  },
};