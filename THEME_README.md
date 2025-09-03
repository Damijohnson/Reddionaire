# Redditionaire Theme System

## Overview
Redditionaire now includes a professional theme system that allows subreddit moderators to customize the game's appearance while maintaining consistency and usability.

## Features

### 🎨 **Professional Game Show Styling**
- **Golden primary color** (#FFD700) for brand identity
- **Consistent color palette** with semantic meanings
- **Professional shadows and borders** throughout the interface
- **Game show specific colors** for money ladder, lifelines, and answers

### 🎛️ **Mod Customization**
Moderators can customize the game's appearance through Reddit settings:

#### Available Settings:
- `enable_custom_theme` - Enable/disable custom theming
- `accent_color` - Main accent color (hex format)
- `card_background` - Background color for cards
- `primary_color` - Primary brand color
- `text_color` - Main text color

#### Theme Presets:
1. **Classic Game Show** - Traditional golden theme (default)
2. **Modern Dark** - Contemporary dark theme
3. **Vintage Retro** - Retro 70s style
4. **Neon Cyberpunk** - Bright neon theme

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

### Custom Theme Configuration
```typescript
import { getThemeFromSettings } from './themeConfig.js';

// Get custom theme from mod settings
const customTheme = await getThemeFromSettings(context);
const accentColor = customTheme.accentColor;
```

### Theme Presets
```typescript
import { THEME_PRESETS, applyThemePreset } from './themeConfig.js';

// Apply a preset theme
const modernTheme = applyThemePreset('MODERN');
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
- Test themes with different color combinations

### ❌ **Don't:**
- Hardcode hex colors directly in components
- Use arbitrary spacing values
- Override theme colors without considering accessibility
- Create themes that reduce contrast below WCAG guidelines

## Accessibility

The theme system is designed with accessibility in mind:
- **High contrast ratios** for text readability
- **Semantic color usage** that works with screen readers
- **Consistent visual hierarchy** for navigation
- **Fallback colors** for custom theme failures

## Future Enhancements

Planned improvements to the theme system:
- **CSS custom properties** for dynamic theming
- **Animation presets** for interactive elements
- **Seasonal themes** (holiday, special events)
- **User preference themes** (light/dark mode)
- **Advanced color schemes** with multiple accent colors

## Support

For theme-related issues or customization requests:
1. Check the theme configuration in Reddit settings
2. Verify color values are valid hex codes
3. Test with different color combinations
4. Ensure sufficient contrast for readability

---

*The Redditionaire theme system provides a professional, customizable appearance while maintaining the excitement and polish of a real game show experience.*
