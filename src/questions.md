# Redditionaire Questions System

## Overview
This document explains the questions system for the Redditionaire game, including rotation rules, difficulty distribution, and metadata structure.

## Questions JSON Structure

### Metadata Fields

| Field | Description | Example |
|-------|-------------|---------|
| `version` | Version of this question pack | `"1.0.0"` |
| `packId` | Unique identifier for this pack | `"redditionaire-v1"` |
| `totalQuestions` | Total questions available in the pack | `1000` |
| `difficultyDistribution` | Percentage breakdown of question difficulties | `{"easy": 0.4, "medium": 0.4, "hard": 0.2}` |
| `questionsPerGame` | Number of questions per game session | `12` |
| `rotationMode` | How questions rotate (daily for tournament fairness) | `"daily"` |
| `refreshWindow` | How often to refresh the question set | `"24h"` |
| `maxFrequencyCap` | Days before a question can repeat | `30` |
| `lastUpdated` | When this pack was last updated | `"2024-01-01"` |

### Question Structure

Each question contains:
- **`id`**: Unique question identifier
- **`question`**: The question text
- **`options`**: Array of 4 answer choices
- **`correctAnswer`**: Index of correct answer (0-3)
- **`difficulty`**: "easy", "medium", or "hard"
- **`category`**: Question category (geography, science, literature, etc.)
- **`explanation`**: Educational explanation of the answer

## Rotation System

### Daily Tournament Mode
- **Same 12 questions** for everyone per day
- **Deterministic seed** using date + subreddit ID
- **Fair competition** - all players see identical questions
- **24-hour refresh** for daily tournaments

### Difficulty Distribution
Each game includes exactly:
- **5 Easy questions** (40%)
- **4 Medium questions** (40%) 
- **3 Hard questions** (20%)

This ensures balanced progression and keeps games engaging.

## Anti-Repetition Rules

### User Level
- **Recent Questions**: Exclude last 150 questions seen by user
- **Personal History**: Track individual player experience

### Subreddit Level  
- **Recent Questions**: Exclude last 90 questions from subreddit
- **Frequency Cap**: Question can't appear again for 30 days
- **Community Variety**: Ensures subreddit doesn't see same questions too often

## Failure Safety

### Fallback System
- **Local Backup**: 12 fallback questions if remote pack fails
- **Version Awareness**: Game continues with same pack version
- **Never Breaks**: Players can always complete their game

### Fallback Questions
```json
"fallbackQuestions": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
```

## Question Categories

Current categories include:
- **Geography**: Countries, capitals, landmarks
- **Science**: Physics, chemistry, biology, astronomy
- **Literature**: Authors, books, plays
- **Art**: Painters, paintings, art movements
- **History**: Events, dates, historical figures
- **Music**: Composers, musical pieces
- **Mathematics**: Basic math, numbers, calculations

## Scaling to 1000 Questions

### Easy Expansion
- Add questions to existing categories
- Maintain difficulty distribution ratios
- Keep consistent metadata structure
- Use same rotation rules

### Quality Control
- Verify correct answers
- Ensure appropriate difficulty ratings
- Add educational explanations
- Test question clarity

## Implementation Notes

### Daily Seed Generation
```javascript
const dailySeed = `${currentDate}_${subredditId}`;
const seededRandom = new SeededRandom(dailySeed);
```

### Question Selection
```javascript
// Select 5 easy, 4 medium, 3 hard questions
const easyQuestions = getQuestionsByDifficulty('easy', 5);
const mediumQuestions = getQuestionsByDifficulty('medium', 4);
const hardQuestions = getQuestionsByDifficulty('hard', 3);
```

### Exclusion Filtering
```javascript
// Filter out recently seen questions
const availableQuestions = allQuestions.filter(q => 
  !userRecentQuestions.includes(q.id) &&
  !subredditRecentQuestions.includes(q.id)
);
```

## Future Enhancements

### Analytics
- Track question performance
- Monitor difficulty ratings
- Analyze player success rates
- Optimize question distribution

### Dynamic Difficulty
- Adjust based on player skill
- Personalize question selection
- Adaptive difficulty progression

### Question Packs
- Multiple themed packs
- Seasonal questions
- Special event questions
- User-generated content

## Maintenance

### Regular Updates
- Add new questions monthly
- Review difficulty ratings
- Update explanations
- Monitor performance metrics

### Quality Assurance
- Fact-check all answers
- Verify question clarity
- Test with sample players
- Maintain educational value
