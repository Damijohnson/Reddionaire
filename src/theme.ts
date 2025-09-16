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

  // UI Specific Colors
  white: '#FFFFFF',
  pink: '#F2D6FF',
  purple: '#7369D7', //Table Odd
  darkPurple: '#6157cb', //Table Even
  darkerPurple: '#5449C8', //Table Background
  darkestPurple: '#3F2C90',

  // Status Colors
  success: '#10B981',
  error: '#EF4444',
  disabled: '#CBD5E1',
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
    textWeight: "bold" as const,
    text: colors.white
  },
  disabled: {
    background: colors.disabled,
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
    background: colors.primary
  },
  secondary: {
    background: colors.secondary,
    icon: {
      gap: "small" as const
    }
  },
  accent: {
    background: colors.accent
  }
};

export const card = {
  container: {
    padding: "small" as const,
    cornerRadius: "small" as const,
    background: colors.pink,
    gap: "small" as const,
    alignment: "start" as const,
    textColor: colors.darkestPurple,
    textSize: typography.paragraph.textSize,
    textWeight: "bold" as const,
  },
  highlight: {
    background: colors.secondary,
    textColor: colors.white,
    padding: "small" as const,
    cornerRadius: "small" as const,
    textSize: typography.paragraph.textSize,
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
    textWeight: "bold" as const,
  },
  answers: {
    button: {
      height: buttons.medium.height,
      padding: buttons.base.padding,
      cornerRadius: buttons.base.cornerRadius,
      background: colors.darkerPurple,
      textColor: colors.white,
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
      text: buttons.base.text,
      height: buttons.small.height,
      cornerRadius: buttons.base.cornerRadius,
      padding: buttons.base.padding,
      textSize: buttons.small.textSize,
      textWeight: buttons.base.textWeight,
      disabledColor: buttons.disabled.background,
      gap: "small" as const
    },
    fiftyFifty: {
      background: buttons.primary.background,
    
    },
    ask: {
      background: buttons.accent.background,
    },
    call: {
      background: buttons.secondary.background,
    },
  },
  moneyLadder: {
    container: {
      width: 110,
      height: 30,
      textColor: colors.white,
      padding: "none" as const,
      cornerRadius: "small" as const,
      textSize: "small" as const,
      textWeight: "bold" as const,
      background: colors.darkerPurple
    },
    milestone: {
      textColor: colors.accent,
      textSize: "small" as const,
    }
  },
  audienceResults: {
    container: {
      padding: "medium" as const,
      cornerRadius: card.container.cornerRadius,
      background: colors.darkPurple,
      gap: card.container.gap,
      textColor: colors.white,
      textSize: "small" as const,
      textWeight: "bold" as const,
      correctAnswer: colors.success,
      wrongAnswer: colors.error,
    },
    hide: {
      padding: buttons.base.padding,
      background: colors.purple,
      textWeight: buttons.base.textWeight,
      textSize: buttons.small.textSize,
      textColor: buttons.base.text,
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
  button: {
    width: buttons.base.width,
    height: buttons.base.height,
    cornerRadius: buttons.base.cornerRadius,
    padding: buttons.base.padding,
    alignment: buttons.base.alignment,
    textSize: buttons.base.textSize,
    textWeight: buttons.base.textWeight,
    text: buttons.base.text,
    background: buttons.primary.background,
  },
};