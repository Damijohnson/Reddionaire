# Reddionaire Game

A Reddit-based game show app built with Devvit that tests users' knowledge with 12 questions and a money ladder system.

## Game Overview

Reddionaire is a "Who Wants to Be a Millionaire" style game where players answer 12 questions to win up to R$1,000,000. The game features:

- **Money Ladder**: Progressive prize amounts with milestone questions
- **Timer System**: 30-second countdown for each question
- **Lifelines**: 50:50, Ask Audience, and Phone a Friend
- **Question Rotation**: Dynamic question selection per game session
- **Leaderboard**: Track high scores per subreddit

## Main Functions Documentation

### Core Game Functions

#### `getQuestionsForGame(subredditId: string)`
**Purpose**: Generates a unique set of questions for each game session
**Parameters**: 
- `subredditId`: The subreddit name to create unique question sets
**Returns**: Array of shuffled questions with progressive difficulty
**Features**:
- Creates session-specific seed for randomization
- Progressive difficulty: 4 easy, 4 medium, 4 hard questions
- Shuffles answer options for each question
- Falls back to default questions if needed

#### `createPost(context)`
**Purpose**: Creates a new Reddit post for the game
**Parameters**: 
- `context`: Devvit context object
**Returns**: Reddit post object
**Features**:
- Generates post with loading screen preview
- Sets up game post in the subreddit

### Game State Management

#### State Variables
- `currentQuestion`: Current question index (0-11)
- `score`: Current score as string (e.g., "100,000")
- `gameStatus`: Game state ('waiting' | 'playing' | 'won' | 'lost' | 'walked')
- `fiftyFifty`: Whether 50:50 lifeline is available
- `askAudience`: Whether Ask Audience lifeline is available
- `phoneFriend`: Whether Phone a Friend lifeline is available
- `showHint`: Whether hint is currently displayed
- `usedLifelines`: Array of used lifeline types
- `showWalkAway`: Whether walk-away prompt is shown
- `showLeaderboard`: Whether leaderboard page is shown
- `showHowToPlay`: Whether how-to-play page is shown
- `leaderboardData`: Array of leaderboard entries
- `gameQuestions`: Array of questions for current game
- `lastAnswerExplanation`: Explanation for last answered question
- `hiddenOptions`: Array of hidden answer option indices (50:50)
- `audienceResults`: Array of audience poll percentages
- `showAudienceResults`: Whether audience results are displayed
- `timeLeft`: Seconds remaining on timer
- `timerActive`: Whether timer is currently running
- `timedOut`: Whether game ended due to timeout

#### `startGame()`
**Purpose**: Initializes a new game session
**Features**:
- Generates questions for the current subreddit
- Resets all game state variables
- Starts the timer (30 seconds)
- Sets game status to 'playing'

#### `resetGame()`
**Purpose**: Resets the game to initial state
**Features**:
- Clears all game state
- Stops and resets timer
- Returns to main menu

#### `answerQuestion(selectedAnswer: number)`
**Purpose**: Handles player's answer selection
**Parameters**:
- `selectedAnswer`: Index of the selected answer (0-3)
**Features**:
- Stops timer when answer is selected
- Checks if answer is correct
- Updates score and moves to next question
- Handles game over for wrong answers
- Manages milestone walk-away prompts

### Timer System

#### `timerInterval`
**Purpose**: useInterval hook that manages the countdown timer
**Features**:
- Runs every 1000ms (1 second)
- Decrements timeLeft when active
- Calls handleTimeUp() when time reaches 0
- Only runs when timerActive is true

#### `handleTimeUp()`
**Purpose**: Handles when the timer expires
**Features**:
- Sets timed out flag
- Shows correct answer and explanation
- Ends game with 'lost' status

### Lifeline System

#### `useLifeline(lifeline: string)`
**Purpose**: Handles lifeline usage
**Parameters**:
- `lifeline`: Type of lifeline ('fiftyFifty', 'askAudience', 'phoneFriend')
**Features**:
- **50:50**: Hides 2 wrong answers randomly
- **Ask Audience**: Shows audience poll results with percentages
- **Phone a Friend**: Displays a helpful hint
- Tracks used lifelines to prevent reuse

#### `generateAudienceResults(question, userId, questionId)`
**Purpose**: Creates deterministic audience poll results
**Parameters**:
- `question`: Current question object
- `userId`: Player's user ID for consistent results
- `questionId`: Question ID for seeding
**Returns**: Array of percentages for each answer option
**Features**:
- Deterministic results (same user gets same results)
- Difficulty-based accuracy (easy: 50-80%, medium: 35-70%, hard: 20-60%)
- Correct answer highlighted in green

### UI Rendering Functions

#### `renderMoneyLadder()`
**Purpose**: Renders the money ladder display
**Features**:
- Shows current prize amount
- Displays milestone indicator
- Shows timer with stopwatch icon
- Responsive layout (60% money, 40% timer)

#### `renderQuestion()`
**Purpose**: Renders the current question and answer options
**Features**:
- Question text with styling
- Answer options (A, B, C, D)
- Handles hidden options (50:50 lifeline)
- Shows audience results when active
- Displays hints when Call lifeline used
- Shows answer explanations

#### `renderLifelines()`
**Purpose**: Renders the three lifeline buttons
**Features**:
- 50:50 button (eliminates 2 wrong answers)
- Ask Audience button (shows poll results)
- Phone a Friend button (shows hint)
- Disabled state for used lifelines

#### `renderAudienceResults()`
**Purpose**: Renders audience poll results
**Features**:
- Shows percentage bars for each option
- Correct answer highlighted in green
- Wrong answers in red
- Hide button to return to answers

### Game Over Screens

#### `renderWon()`
**Purpose**: Renders victory screen
**Features**:
- Congratulations message
- R$1,000,000 prize display
- Success message
- Play Again button

#### `renderLost()`
**Purpose**: Renders game over screen
**Features**:
- Game Over message
- Question number where lost
- "Times up!" if timed out
- Answer explanation
- Play Again button

#### `renderWalked()`
**Purpose**: Renders walk-away screen
**Features**:
- Walk away message
- Amount secured
- Play Again button

#### `renderWalkAwayPrompt()`
**Purpose**: Renders milestone decision screen
**Features**:
- Milestone reached message
- Amount secured
- Continue or Walk Away buttons
- Timer display for decision

### Page Rendering Functions

#### `renderLeaderboard()`
**Purpose**: Renders the leaderboard page
**Features**:
- Shows top scores for subreddit
- Username and score display
- Trophy icon for #1 player
- Back to start button

#### `renderHowToPlay()`
**Purpose**: Renders the how-to-play page
**Features**:
- Game objective explanation
- Money ladder rules
- Lifeline descriptions
- Back to start button

### Utility Functions

#### `continueGame()`
**Purpose**: Continues game after milestone decision
**Features**:
- Hides walk-away prompt
- Restarts timer for next question

#### `walkAway()`
**Purpose**: Ends game with current winnings
**Features**:
- Sets game status to 'walked'
- Updates leaderboard with current score

#### `handleShowHowToPlay()`
**Purpose**: Shows how-to-play page
**Features**:
- Hides other pages
- Shows game instructions

#### `handleBackToStart()`
**Purpose**: Returns to main menu
**Features**:
- Hides all sub-pages
- Returns to start screen

### Internal Helper Functions

#### `seededRandom()`
**Purpose**: Creates deterministic random numbers for audience results
**Features**:
- Uses linear congruential generator
- Ensures same user gets same audience results
- Part of generateAudienceResults function

#### `shuffledWrong` (in useLifeline)
**Purpose**: Randomly selects wrong answers to hide for 50:50
**Features**:
- Shuffles array of wrong answer indices
- Selects first 2 for hiding
- Ensures correct answer is never hidden

## Game Flow

1. **Start**: Player clicks "Start Game"
2. **Question**: 30-second timer starts, player answers
3. **Correct**: Move to next question, update score
4. **Wrong/Timeout**: Game over, show explanation
5. **Milestone**: Option to continue or walk away
6. **Win**: Complete all 12 questions for R$1,000,000
7. **Leaderboard**: Score saved to subreddit leaderboard

## Constants and Configuration

### Core Game Constants

#### `BGURL`
- **Value**: `"app_bg_v2.jpg"`
- **Purpose**: Background image URL for the game interface
- **Type**: String constant

#### `MONEY_LADDER`
- **Purpose**: Defines the prize amounts and milestone questions
- **Structure**: Array of objects with `question`, `amount`, and `milestone` properties
- **Values**:
  - Question 1: R$100,000 (no milestone)
  - Question 2: R$150,000 (no milestone)
  - Question 3: R$200,000 (no milestone)
  - Question 4: R$250,000 (milestone)
  - Question 5: R$300,000 (no milestone)
  - Question 6: R$400,000 (no milestone)
  - Question 7: R$500,000 (no milestone)
  - Question 8: R$600,000 (milestone)
  - Question 9: R$700,000 (no milestone)
  - Question 10: R$800,000 (no milestone)
  - Question 11: R$850,000 (no milestone)
  - Question 12: R$1,000,000 (milestone)

### Theme Constants

#### `colors`
- **Purpose**: Color palette for the entire application
- **Brand Colors**:
  - `background`: '#5A4FCC' (Main purple background)
  - `primary`: '#37BDF9' (Light blue)
  - `secondary`: '#E979FA' (Pink)
  - `accent`: '#F9CC13' (Yellow)
- **UI Colors**:
  - `white`: '#FFFFFF'
  - `gold`: '#F29D0A'
  - `pink`: '#F2D6FF'
  - `purple`: '#7369D7' (Table odd rows)
  - `darkPurple`: '#6157cb' (Table even rows)
  - `darkerPurple`: '#5449C8' (Table background)
  - `darkestPurple`: '#3F2C90'
- **Status Colors**:
  - `success`: '#10B981'
  - `error`: '#EF4444'
  - `disabled`: '#CBD5E1'

#### `typography`
- **Purpose**: Text styling definitions
- **Properties**:
  - `paragraph`: Small text size
  - `heading1`: XXLarge, bold
  - `heading2`: XLarge, bold
  - `heading3`: Large, bold
  - `heading4`: Medium, bold

#### `buttons`
- **Purpose**: Button styling configurations
- **Base Properties**:
  - `width`: 100%
  - `height`: 50px
  - `cornerRadius`: "small"
  - `padding`: "small"
  - `alignment`: "middle center"
  - `textSize`: "medium"
  - `textWeight`: "bold"
  - `textColor`: white
- **Variants**:
  - `small`: 30px height, regular weight, small text
  - `medium`: 40px height
  - `primary`: Light blue background
  - `secondary`: Pink background
  - `accent`: Yellow background
  - `disabled`: Disabled color background

#### `card`
- **Purpose**: Card container styling
- **Container Properties**:
  - `padding`: "small"
  - `cornerRadius`: "small"
  - `background`: Pink
  - `gap`: "small"
  - `alignment`: "start"
  - `textColor`: Darkest purple
  - `textSize`: Medium
  - `textWeight`: "bold"
- **Highlight Properties**:
  - `background`: Secondary color
  - `textColor`: White
  - `padding`: "small"
  - `cornerRadius`: "small"
  - `textSize`: Small

#### `table`
- **Purpose**: Leaderboard table styling
- **Properties**:
  - `background`: Darker purple
  - `cornerRadius`: "small"
  - `color`: White
  - `gold`: Accent color
  - `textSize`: Medium
- **Header**: Bold text weight
- **Odd Items**: Purple background
- **Even Items**: Dark purple background

#### `gameUI`
- **Purpose**: Game-specific UI styling
- **Question**: Bold text weight
- **Answers Button**:
  - `height`: 40px
  - `padding`: "small"
  - `cornerRadius`: "small"
  - `background`: Darker purple
  - `textColor`: White
  - `disabledColor`: Error color
  - `textSize`: Small
  - `gap`: "small"
  - `prefix`: 20px width, regular weight
- **Lifelines Button**:
  - `width`: 33%
  - `textColor`: White
  - `height`: 30px
  - `cornerRadius`: "small"
  - `padding`: "small"
  - `textSize`: Small
  - `textWeight`: "bold"
  - `disabledColor`: Disabled color
  - `gap`: "small"
- **Lifeline Colors**:
  - `fiftyFifty`: Primary background
  - `ask`: Accent background
  - `call`: Secondary background
- **Money Ladder**:
  - `container`: 110px width, 30px height, gold background
  - `milestone`: Accent color, small text
- **Audience Results**:
  - `container`: Medium padding, dark purple background, white text
  - `correctAnswer`: Success color
  - `wrongAnswer`: Error color
  - `hide`: Purple background, small text

#### `page`
- **Purpose**: Page layout styling
- **Base Properties**:
  - `alignment`: "center"
  - `gap`: "medium"
  - `padding`: "small"
- **Header**:
  - `title`: 175px width, 30px height
  - `close`: 25px width, 25px height
- **Heading**: XXLarge, bold, accent color, center aligned
- **Subheading**: XXLarge, bold, accent color, center aligned
- **Paragraph**: Small, accent color, center aligned
- **Button**: Inherits from buttons.base with primary background

### Questions Configuration

#### `questions.json` Metadata
- **version**: "1.0.0"
- **packId**: "redditionaire-v1"
- **totalQuestions**: 1000
- **difficultyDistribution**:
  - Easy: 40%
  - Medium: 40%
  - Hard: 20%
- **questionsPerGame**: 12
- **rotationMode**: "daily"
- **refreshWindow**: "24h"
- **maxFrequencyCap**: 30
- **lastUpdated**: "2024-01-01"

### Server Configuration

#### `LeaderboardService` Constants
- **leaderboardKey**: `leaderboard:${subredditName}`
- **maxEntries**: 10 (top scores kept)
- **scoreFormat**: Comma-separated thousands (e.g., "100,000")
- **defaultUsername**: "Anonymous"

## Game Configuration

- **Questions per game**: 12
- **Timer per question**: 30 seconds
- **Money ladder**: R$100,000 to R$1,000,000
- **Milestones**: Questions 4, 8, and 12
- **Lifelines**: One use each per game

## Dependencies

- `@devvit/public-api`: Reddit Devvit framework
- `questions.json`: Question database
- `theme.ts`: Styling configuration
- `server.js`: Leaderboard service
