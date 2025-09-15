// Game Show Theme System
// Professional styling tokens for Redditionaire

export const colors = {
  // Brand Colors
  background: '#5A4FCC', // Main purple background
  primary: '#37BDF9', // Light blue for Start Game button
  secondary: '#E979FA', // Pink for Leaderboard button
  accent: '#F9CC13', // Yellow for How to Play button

  // Game Colors
  questionHeader: '#8E68F0', // Updated purple badge
  questionBackground: '#F2D6FF', // Updated lighter purple background
  questionText: '#3F2C90', // New: dark purple question text
  answerButton: '#5B4FD6', // Updated answer button purple
  answerText: '#FFFFFF', // White text for answers
  lifeline5050: '#3CCFCF', // Blue 50:50 button
  lifelineAsk: '#FFD700', // Yellow Ask button
  lifelineCall: '#FF69B4', // Pink Call button
  moneyLadderBg: '#5449C8', // Purple money ladder background
  milestoneColor: '#FFD700', // Yellow milestone indicator
  
  // Status Colors
  success: '#10B981', // Green for correct answers
  error: '#EF4444', // Red for wrong answers
  
  // Neutral Colors
  neutral100: '#FFFFFF', // Pure white
  neutral400: '#CBD5E1', // Medium gray
  neutral700: '#475569',
  neutral900: '#1E293B', // Almost black
  
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
export const buttons = {
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
    background: colors.primary,
    text: colors.neutral100
  },

  // Leaderboard button
  secondary: {
    background: colors.secondary,
    text: colors.neutral100,
    icon: {
      gap: "small" as const
    }
  },

  // How to Play button
  accent: {
    background: colors.accent,
    text: colors.neutral100
  }
};

export const gameUI = {
  question: {
    container: {
      padding: "medium" as const,
      cornerRadius: "small" as const,
      background: colors.questionBackground
    },
    header: {
      width: 140,
      background: colors.secondary,
      textColor: colors.neutral100,
      padding: "small" as const,
      cornerRadius: "small" as const
    }
  },
  answers: {
    button: {
      height: 52,
      padding: "small" as const,
      cornerRadius: "small" as const,
      background: colors.answerButton,
      textColor: colors.answerText,
      disabledColor: colors.error,
      gap: "small" as const,
      prefix: {
        width: 40,
        weight: "bold" as const
      }
    }
  },
    lifelines: {
    button: {
      height: 40,
      width: 100,
      cornerRadius: "small" as const,
      gap: "small" as const
    }
  },
  moneyLadder: {
    header: {
      color: colors.neutral100,
      size: "small" as const,
      weight: "bold" as const
    },
    container: {
      padding: "none" as const,
      cornerRadius: "large" as const,
      background: colors.moneyLadderBg
    },
    milestone: {
      color: colors.milestoneColor,
      size: 8
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