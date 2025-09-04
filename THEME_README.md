# Redditionaire Theme System

## Overview
Redditionaire includes a professional theme system for consistent, game show styling throughout the application.

## Features

### 🎨 **Professional Game Show Styling**
- **Golden primary color** (#FFD700) for brand identity
- **Consistent color palette** with semantic meanings
- **Professional shadows and borders** throughout the interface
- **Game show specific colors** for money ladder, lifelines, and answers

### 🧩 **Theme Constants**
The theme system provides consistent styling tokens:

```typescript
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from './theme.js';

// Colors
COLORS.PRIMARY        // #FFD700 - Golden yellow
COLORS.SUCCESS        // #10B981 - Green for correct answers
COLORS.ERROR          // #EF4444 - Red for wrong answers
COLORS.NEUTRAL_100    // #FFFFFF - Pure white

// Spacing
SPACING.SM            // 8px
SPACING.MD            // 16px
SPACING.LG            // 24px

// Typography
TYPOGRAPHY.SIZES.LG   // 18px
TYPOGRAPHY.WEIGHTS.BOLD // 700

// Shadows
SHADOWS.GOLD          // Golden glow effect
SHADOWS.MD            // Medium shadow
```

## Usage Examples

### Basic Theme Integration
```typescript
import { COLORS, RADIUS, SHADOWS } from './theme.js';

// Use theme colors in components
<vstack 
  backgroundColor={COLORS.NEUTRAL_200}
  cornerRadius={RADIUS.MD}
  shadow={SHADOWS.SM}
>
  <text color={COLORS.PRIMARY}>Golden text</text>
</vstack>
```

## Color Meanings

### Primary Colors
- **PRIMARY** - Main brand color, used for titles and highlights
- **SECONDARY** - Supporting color, used for secondary text and borders
- **SUCCESS** - Green, used for correct answers and completed items
- **ERROR** - Red, used for wrong answers and error states

### Neutral Colors
- **NEUTRAL_100** - Pure white, primary backgrounds
- **NEUTRAL_200** - Very light gray, secondary backgrounds
- **NEUTRAL_300** - Light gray, borders and dividers
- **NEUTRAL_400-900** - Progressively darker grays for text

### Game Show Specific
- **MONEY_GREEN** - Money ladder and financial elements
- **MILESTONE_BLUE** - Milestone indicators and achievements
- **LIFELINE_ORANGE** - Lifeline buttons and interactive elements
- **AUDIENCE_YELLOW** - Audience results and voting displays

## Best Practices

### ✅ **Do:**
- Use semantic color constants (e.g., `COLORS.SUCCESS` for correct answers)
- Maintain consistent spacing with `SPACING` constants
- Use appropriate shadow levels for depth

### ❌ **Don't:**
- Hardcode hex colors directly in components
- Use arbitrary spacing values
- Override theme colors without considering accessibility

---

*The Redditionaire theme system provides a professional, consistent appearance for the game show experience.*
