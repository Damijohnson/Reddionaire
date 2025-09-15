// Game Show Theme System
// Professional styling tokens for Redditionaire


export const defaultColors = {

};

export const colors = {
  // Brand Colors
  background: '#5A4FCC', // Main purple background
  primary: '#37BDF9', // Light blue 
  secondary: '#E979FA', // Pink
  accent: '#F9CC13', // Yellow
  white: '#FFFFFF',

  purple: '#7369D7',
  darkPurple: '#6157cb',
  darkerPurple: '#5449C8',

  // UI Specific Colors
  questionHeader: '#8E68F0', // Updated purple badge
  questionBackground: '#F2D6FF', // Updated lighter purple 
  questionText: '#3F2C90', // Purple
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
  neutral400: '#CBD5E1', // Medium gray
  neutral700: '#475569',
  neutral900: '#1E293B', // Almost black
  
};

export const typography = {
  paragraph: {
    textSize: "small" as const,
  },
  heading1: {
    textSize: "xxlarge" as const,
    textWeight: "bold" as const
  },
  heading2: {
    textSize: "xlarge" as const,
    textWeight: "bold" as const
  },
  heading3: {
    textSize: "large" as const,
    textWeight: "bold" as const
  },
  heading4: {
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
    padding: "small" as const,
    alignment: "middle center" as const,
    textSize: "medium" as const,
    textWeight: "bold" as const
  },
  small: {
    height: 30,
    textWeight: "regular" as const,
    textSize: "small" as const,
  },
  medium: {
    height: 40,
  },
  primary: {
    background: colors.primary,
    text: colors.white
  },
  secondary: {
    background: colors.secondary,
    text: colors.white,
    icon: {
      gap: "small" as const
    }
  },
  accent: {
    background: colors.accent,
    text: colors.white
  }
};

export const table = {
background: colors.darkerPurple,
cornerRadius: "small" as const,
color: colors.white,
gold: colors.accent,
textSize: typography.paragraph.textSize,
header: {
  textWeight: "bold" as const
},
oddItem: {
  background: colors.purple,
},
evenItem: {
  background: colors.darkPurple,
},
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
      textColor: colors.white,
      padding: "small" as const,
      cornerRadius: "small" as const
    }
  },
  answers: {
    button: {
      height: buttons.medium.height,
      padding: buttons.base.padding,
      cornerRadius: buttons.base.cornerRadius,
      background: colors.answerButton,
      textColor: colors.answerText,
      disabledColor: colors.error,
      textSize: buttons.small.textSize,
      gap: "small" as const,
      prefix: {
        width: 20,
        weight: "regular" as const
      }
    }
  },
    lifelines: {
    button: {
      width: 33,
      height: buttons.small.height,
      cornerRadius: buttons.base.cornerRadius,
      padding: buttons.base.padding,
      textSize: buttons.small.textSize,
      textWeight: buttons.small.textWeight,
      gap: "small" as const
    }
  },
  moneyLadder: {
    header: {
      color: colors.white,
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
  base: {
    alignment: "center" as const,
    gap: "medium" as const,
    padding: "small" as const,
  },
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
  heading: {
    textSize: typography.heading1.textSize,
    textWeight: typography.heading1.textWeight,
    textColor: colors.accent,
    alignment: "center" as const,
  },
  subheading: {
    textSize: typography.heading1.textSize,
    textWeight: typography.heading1.textWeight,
    textColor: colors.accent,
    alignment: "center" as const,
  },
  paragraph: {
    textSize: typography.paragraph.textSize,
    textColor: colors.accent,
    alignment: "center" as const,
  },
  mainButton: {
    width: buttons.base.width,
    height: buttons.base.height,
    cornerRadius: buttons.base.cornerRadius,
    padding: buttons.base.padding,
    alignment: buttons.base.alignment,
    textSize: buttons.base.textSize,
    textWeight: buttons.base.textWeight,
    textColor: buttons.primary.text,
    background: buttons.primary.background,
  },
};