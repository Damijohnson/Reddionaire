// Learn more at developers.reddit.com/docs
import { Devvit, useState, TriggerContext } from "@devvit/public-api";
import questionsData from "./questions.json" with { type: "json" };
import { LeaderboardService } from "./server.js";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS, GAME_SHOW, BUTTONS, GAME_UI } from "./theme.js";

Devvit.configure({
  redditAPI: true,
  redis: true,
});

const BGURL = "app_bg_v2.jpg";

// Game constants
const MONEY_LADDER = [
  { question: 1, amount: "$100K", milestone: false },
  { question: 2, amount: "$150K", milestone: false },
  { question: 3, amount: "$200K", milestone: false },
  { question: 4, amount: "$250K", milestone: true },
  { question: 5, amount: "$300K", milestone: false },
  { question: 6, amount: "$400K", milestone: false },
  { question: 7, amount: "$500K", milestone: false },
  { question: 8, amount: "$600K", milestone: true },
  { question: 9, amount: "$700K", milestone: false },
  { question: 10, amount: "$800K", milestone: false },
  { question: 11, amount: "$850K", milestone: false },
  { question: 12, amount: "$1M", milestone: true },
];

// Question rotation system
// TODO: Look into daily rotation system - currently has issues with fallback questions and hash function
const getQuestionsForGame = (subredditId: string, date: string): typeof questionsData.questions => {
  // Create a daily seed based on date and subreddit
  const dailySeed = `${date}_${subredditId}`;
  
  // Simple hash function for consistent seeding
  let hash = 0;
  for (let i = 0; i < dailySeed.length; i++) {
    const char = dailySeed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use the hash to shuffle questions consistently
  const shuffledQuestions = [...questionsData.questions].sort(() => {
    hash = (hash * 9301 + 49297) % 233280;
    return (hash / 233280) - 0.5;
  });
  
  // Select questions based on difficulty distribution
  const { easy, medium, hard } = questionsData.rotationRules.difficultyBuckets;
  const questionsPerGame = questionsData.metadata.questionsPerGame;
  
  const selectedQuestions: typeof questionsData.questions = [];
  
  // Add easy questions
  const easyQuestions = shuffledQuestions.filter(q => q.difficulty === "easy").slice(0, easy);
  selectedQuestions.push(...easyQuestions);
  
  // Add medium questions
  const mediumQuestions = shuffledQuestions.filter(q => q.difficulty === "medium").slice(0, medium);
  selectedQuestions.push(...mediumQuestions);
  
  // Add hard questions
  const hardQuestions = shuffledQuestions.filter(q => q.difficulty === "hard").slice(0, hard);
  selectedQuestions.push(...hardQuestions);
  
  // If we don't have enough questions, add from fallback
  if (selectedQuestions.length < questionsPerGame) {
    const fallbackQuestions = questionsData.rotationRules.fallbackQuestions.map(id => 
      questionsData.questions.find(q => q.id === id)
    ).filter(Boolean) as typeof questionsData.questions;
    
    selectedQuestions.push(...fallbackQuestions.slice(0, questionsPerGame - selectedQuestions.length));
  }
  
  // Ensure we have exactly the right number of questions
  return selectedQuestions.slice(0, questionsPerGame);
};

// Game state interface
interface GameState {
  currentQuestion: number; 
  score: number;
  gameStatus: 'waiting' | 'playing' | 'won' | 'lost' | 'walked';
  lifelines: {
    fiftyFifty: boolean;
    askAudience: boolean;
    phoneFriend: boolean;
  };
  usedLifelines: string[];
}

const createPost = async (context: Devvit.Context | TriggerContext) => {
  const { reddit } = context;
  const subreddit = await reddit.getCurrentSubreddit();
  const post = await reddit.submitPost({
    title: "Who Wants to Be a Redditionaire? - Test Your Knowledge!",
    subredditName: subreddit.name,
    preview: (
      <vstack height="100%" width="100%" alignment="middle center">
        <text size="large">Redditionaire Game Loading...</text>
      </vstack>
    ),
  });

  return post;
};


// Add a menu item to the subreddit menu for instantiating the new experience post
Devvit.addMenuItem({
  label: "Start Redditionaire Game",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    ui.showToast(
      "Starting Redditionaire game - you'll be redirected to the game post!"
    );

    const post = await createPost(context);

    ui.navigateTo(post);
  },
});

Devvit.addMenuItem({
  label: "Debug: Show BG URL",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (_event, context) => {
    try {
      const url = await context.assets.getURL(BGURL);
      context.ui.showToast(url ?? "(no URL returned)");
    } catch (e) {
      context.ui.showToast(`assets.getURL error: ${String(e)}`);
    }
  },
});

Devvit.addTrigger({
  events: ["AppInstall"],
  onEvent: async (event, context) => {
    await createPost(context);
  },
});

// Add a post type definition
Devvit.addCustomPostType({
  name: "Redditionaire Game",
  height: "tall",
  render: (context) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState<string>("$0");
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'won' | 'lost' | 'walked'>('waiting');
    const [fiftyFifty, setFiftyFifty] = useState(true);
    const [askAudience, setAskAudience] = useState(true);
    const [phoneFriend, setPhoneFriend] = useState(true);
    const [usedLifelines, setUsedLifelines] = useState<string[]>([]);
    const [showWalkAway, setShowWalkAway] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showHowToPlay, setShowHowToPlay] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState<Array<{userId: string, score: number}>>([]);
    const [gameQuestions, setGameQuestions] = useState<typeof questionsData.questions>([]);
    const [lastAnswerExplanation, setLastAnswerExplanation] = useState<string>("");
    const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
    const [audienceResults, setAudienceResults] = useState<number[]>([]);
    const [showAudienceResults, setShowAudienceResults] = useState(false);

    const startGame = async () => {
      try {
        // Get current date and subreddit info for question rotation
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        let subredditId = 'default';
        
        try {
          const subreddit = await context.reddit.getCurrentSubreddit();
          subredditId = subreddit.name;
        } catch (e) {
          console.warn('Could not get subreddit, using default:', e);
        }
        
        // Generate questions for this game
        const questions = getQuestionsForGame(subredditId, today);
        setGameQuestions(questions);
        
        setCurrentQuestion(0);
        setScore("$0");
        setGameStatus('playing');
        setFiftyFifty(true);
        setAskAudience(true);
        setPhoneFriend(true);
        setUsedLifelines([]);
        setShowWalkAway(false);
        setShowLeaderboard(false);
        setShowHowToPlay(false);
        setLastAnswerExplanation("");
      } catch (error) {
        console.error('Error starting game:', error);
        // Fallback to fallback questions
        const fallbackQuestions = questionsData.rotationRules.fallbackQuestions.map(id => 
          questionsData.questions.find(q => q.id === id)
        ).filter(Boolean) as typeof questionsData.questions;
        setGameQuestions(fallbackQuestions);
        setGameStatus('playing');
      }
    };

    const answerQuestion = (selectedAnswer: number) => {
      if (gameQuestions.length === 0) return;
      
      const currentQ = gameQuestions[currentQuestion];
      const isCorrect = selectedAnswer === currentQ.correctAnswer;
      
      if (isCorrect) {
          const newScore = MONEY_LADDER[currentQuestion].amount;
          const nextQuestion = currentQuestion + 1;
          
          // Set explanation for correct answer
          setLastAnswerExplanation(currentQ.explanation || "Correct answer!");
          
          if (nextQuestion >= gameQuestions.length) {
            // Won the game!
            setScore(newScore);
            setGameStatus('won');

          } else {
            // Check if the CURRENT question they just answered is a milestone
            const isMilestone = MONEY_LADDER[currentQuestion].milestone;
            console.log(`Question ${currentQuestion + 1} milestone check:`, isMilestone);
            if (isMilestone) {
              console.log('Setting showWalkAway to true');
              setShowWalkAway(true);
            }
            
            setCurrentQuestion(nextQuestion);
            setScore(newScore);
            setLastAnswerExplanation(""); // Clear explanation for next question
            setHiddenOptions([]); // Reset hidden options for new question
            setAudienceResults([]); // Clear audience results for new question
            setShowAudienceResults(false); // Hide audience results display
          }
        } else {
          // Wrong answer - game over
          setLastAnswerExplanation(currentQ.explanation || "That was incorrect.");
          setGameStatus('lost');
        }
    };

    const walkAway = () => {
      setGameStatus('walked');
      setShowWalkAway(false);

    };

    const continueGame = () => {
      setShowWalkAway(false);
    };

    const generateAudienceResults = (question: any, userId: string, questionId: string) => {
      // Create deterministic seed from userId + questionId
      const seed = `${userId}_${questionId}`;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Simple seeded random function
      const seededRandom = () => {
        hash = (hash * 9301 + 49297) % 233280;
        return hash / 233280;
      };
      
      const correctAnswer = question.correctAnswer;
      const difficulty = question.difficulty;
      
      // Base percentages by difficulty
      let correctPercentage: number;
      if (difficulty === 'easy') {
        correctPercentage = 65 + Math.floor(seededRandom() * 15); // 65-80%
      } else if (difficulty === 'medium') {
        correctPercentage = 50 + Math.floor(seededRandom() * 15); // 50-65%
      } else {
        correctPercentage = 30 + Math.floor(seededRandom() * 15); // 30-45%
      }
      
      // Add small noise (±5-10 points total)
      const noise = (seededRandom() - 0.5) * 10;
      correctPercentage = Math.max(0, Math.min(100, correctPercentage + noise));
      
      // Calculate remaining percentage for wrong answers
      const remainingPercentage = 100 - correctPercentage;
      const wrongOptions = [0, 1, 2, 3].filter(index => index !== correctAnswer);
      
      // Distribute remaining percentage across wrong options with some variation
      const wrongPercentages: number[] = [];
      let totalWrong = 0;
      
      for (let i = 0; i < wrongOptions.length; i++) {
        const basePercentage = remainingPercentage / wrongOptions.length;
        const variation = (seededRandom() - 0.5) * 20; // ±10% variation
        let percentage = Math.max(3, basePercentage + variation); // Floor at 3%
        wrongPercentages.push(percentage);
        totalWrong += percentage;
      }
      
      // Normalize to 100%
      const total = correctPercentage + totalWrong;
      const normalizedCorrect = Math.round((correctPercentage / total) * 100);
      const normalizedWrong = wrongPercentages.map(p => Math.round((p / total) * 100));
      
      // Create final results array
      const results = new Array(4).fill(0);
      results[correctAnswer] = normalizedCorrect;
      
      let wrongIndex = 0;
      for (let i = 0; i < 4; i++) {
        if (i !== correctAnswer) {
          results[i] = normalizedWrong[wrongIndex];
          wrongIndex++;
        }
      }
      
      // Ensure total is 100%
      const finalTotal = results.reduce((sum, val) => sum + val, 0);
      if (finalTotal !== 100) {
        const diff = 100 - finalTotal;
        results[correctAnswer] += diff;
      }
      
      return results;
    };

    const useLifeline = (lifeline: string) => {
      if (lifeline === 'fiftyFifty' && fiftyFifty) {
        // Get current question and hide 2 wrong answers
        const currentQ = gameQuestions[currentQuestion];
        if (currentQ) {
          const correctAnswer = currentQ.correctAnswer;
          const wrongOptions = [0, 1, 2, 3].filter(index => index !== correctAnswer);
          
          // Randomly select 2 wrong options to hide
          const shuffledWrong = wrongOptions.sort(() => Math.random() - 0.5);
          const optionsToHide = shuffledWrong.slice(0, 2);
          
          setHiddenOptions(optionsToHide);
        }
        
        setFiftyFifty(false);
        setUsedLifelines(prev => [...prev, lifeline]);
      } else if (lifeline === 'askAudience' && askAudience) {
        // Generate audience results
        const currentQ = gameQuestions[currentQuestion];
        if (currentQ) {
          const userId = context.userId || 'anonymous';
          const questionId = currentQ.id.toString();
          const results = generateAudienceResults(currentQ, userId, questionId);
          
          setAudienceResults(results);
          setShowAudienceResults(true);
        }
        setAskAudience(false);
        setUsedLifelines(prev => [...prev, lifeline]);
      } else if (lifeline === 'phoneFriend' && phoneFriend) {
        setPhoneFriend(false);
        setUsedLifelines(prev => [...prev, lifeline]);
      }
    };

    const resetGame = () => {
      setCurrentQuestion(0);
      setScore("$0");
      setGameStatus('waiting');
      setFiftyFifty(true);
      setAskAudience(true);
      setPhoneFriend(true);
      setUsedLifelines([]);
      setShowWalkAway(false);
      setShowLeaderboard(false);
      setShowHowToPlay(false);
      setGameQuestions([]);
      setLastAnswerExplanation("");
      setHiddenOptions([]);
      setAudienceResults([]);
      setShowAudienceResults(false);
    };



    const handleShowHowToPlay = () => {
      setShowHowToPlay(true);
      setShowLeaderboard(false);
    };

    const handleBackToStart = () => {
      setShowLeaderboard(false);
      setShowHowToPlay(false);
    };

    const renderMoneyLadder = () => (
      <vstack gap="small" width="100%">
        <text 
          size={GAME_UI.MONEY_LADDER.HEADER.SIZE} 
          weight={GAME_UI.MONEY_LADDER.HEADER.WEIGHT} 
          color={GAME_UI.MONEY_LADDER.HEADER.COLOR}
        >
          Money Ladder
        </text>

        {/* Amount row */}
        <hstack gap="small" alignment="middle center">
          <hstack 
            backgroundColor={COLORS.MONEY_LADDER_BG}
            cornerRadius={GAME_UI.MONEY_LADDER.CONTAINER.CORNER_RADIUS}
            padding={GAME_UI.MONEY_LADDER.CONTAINER.PADDING}
          >
            <hstack gap="small" alignment="middle center">
              <text size="large">🪙</text>
              <text size="medium" weight="bold" color={COLORS.NEUTRAL_100}>
                {MONEY_LADDER[currentQuestion].amount}
              </text>
            </hstack>
          </hstack>
        </hstack>

        {/* Milestone label on its own line */}
        {MONEY_LADDER[currentQuestion].milestone && (
          <text size="small" color={COLORS.NEUTRAL_100}>Milestone</text>
        )}
      </vstack>
    );

    const renderLifelines = () => (
      <vstack gap="small" width="100%">
        <text size="small" weight="bold" alignment="center">Lifelines</text>
        <hstack gap={GAME_UI.LIFELINES.BUTTON.GAP} width="100%" alignment="middle center">
          <hstack 
            width={`${GAME_UI.LIFELINES.BUTTON.WIDTH}px`}
            height={`${GAME_UI.LIFELINES.BUTTON.HEIGHT}px`}
            backgroundColor={fiftyFifty ? COLORS.LIFELINE_50_50 : COLORS.NEUTRAL_400}
            cornerRadius={GAME_UI.LIFELINES.BUTTON.CORNER_RADIUS}
            alignment="middle center"
            onPress={() => { if (fiftyFifty) useLifeline('fiftyFifty'); }}
          >
            <text size="medium" weight="bold" color={COLORS.NEUTRAL_100}>50:50</text>
          </hstack>
          <hstack 
            width={`${GAME_UI.LIFELINES.BUTTON.WIDTH}px`}
            height={`${GAME_UI.LIFELINES.BUTTON.HEIGHT}px`}
            backgroundColor={askAudience ? COLORS.LIFELINE_ASK : COLORS.NEUTRAL_400}
            cornerRadius={GAME_UI.LIFELINES.BUTTON.CORNER_RADIUS}
            alignment="middle center"
            onPress={() => { if (askAudience) useLifeline('askAudience'); }}
          >
            <text size="medium" weight="bold" color={COLORS.NEUTRAL_900}>Ask</text>
          </hstack>
          <hstack 
            width={`${GAME_UI.LIFELINES.BUTTON.WIDTH}px`}
            height={`${GAME_UI.LIFELINES.BUTTON.HEIGHT}px`}
            backgroundColor={phoneFriend ? COLORS.LIFELINE_CALL : COLORS.NEUTRAL_400}
            cornerRadius={GAME_UI.LIFELINES.BUTTON.CORNER_RADIUS}
            alignment="middle center"
            onPress={() => { if (phoneFriend) useLifeline('phoneFriend'); }}
          >
            <text size="medium" weight="bold" color={COLORS.NEUTRAL_100}>Call</text>
          </hstack>
        </hstack>
      </vstack>
    );

    const renderQuestion = () => {
      if (gameQuestions.length === 0) {
        return (
          <vstack gap="medium" width="100%" alignment="center">
            <text size="large" weight="bold" alignment="center">
              Loading Questions...
            </text>
          </vstack>
        );
      }
      
      const currentQ = gameQuestions[currentQuestion];
      return (
        <vstack gap="medium" width="100%">
          <vstack
            width="100%"
            backgroundColor={GAME_UI.QUESTION.CONTAINER.BACKGROUND}
            cornerRadius={GAME_UI.QUESTION.CONTAINER.CORNER_RADIUS}
          >
            {/* Move padding to an inner wrapper so the card looks like it sits behind the text */}
            <vstack padding={GAME_UI.QUESTION.CONTAINER.PADDING} gap="small" alignment="start">
              <hstack
                backgroundColor={GAME_UI.QUESTION.HEADER.BACKGROUND}
                cornerRadius={GAME_UI.QUESTION.HEADER.CORNER_RADIUS}
                padding={GAME_UI.QUESTION.HEADER.PADDING}
              >
                <text size="small" weight="bold" color={GAME_UI.QUESTION.HEADER.TEXT_COLOR}>
                  Question {currentQuestion + 1}
                </text>
              </hstack>
              <text size="xlarge" weight="bold" color={COLORS.QUESTION_TEXT}>
                {currentQ.question}
              </text>
            </vstack>
          </vstack>
          <vstack gap={GAME_UI.ANSWERS.BUTTON.GAP} width="100%">
            {currentQ.options.map((option, index) => (
              <hstack
                key={index.toString()}
                width="100%"
                height={`${GAME_UI.ANSWERS.BUTTON.HEIGHT}px`}
                backgroundColor={hiddenOptions.includes(index) ? COLORS.NEUTRAL_400 : GAME_UI.ANSWERS.BUTTON.BACKGROUND}
                cornerRadius={GAME_UI.ANSWERS.BUTTON.CORNER_RADIUS}
                padding={GAME_UI.ANSWERS.BUTTON.PADDING}
                onPress={() => { if (!hiddenOptions.includes(index)) answerQuestion(index); }}
                alignment="middle center"
              >
                <hstack width={`${GAME_UI.ANSWERS.BUTTON.PREFIX.WIDTH}px`} alignment="middle center">
                  <text size="large" weight={GAME_UI.ANSWERS.BUTTON.PREFIX.WEIGHT} color={GAME_UI.ANSWERS.BUTTON.TEXT_COLOR}>
                    {String.fromCharCode(65 + index)}.
                  </text>
                </hstack>
                <text size="large" color={GAME_UI.ANSWERS.BUTTON.TEXT_COLOR}>
                  {option}
                </text>
              </hstack>
            ))}
          </vstack>
          
          {/* Show audience results if available */}
          {showAudienceResults && audienceResults.length > 0 && (
            <vstack gap="small" width="100%" padding="small" backgroundColor="#FFF8DC" cornerRadius="small">
              <hstack gap="small" alignment="middle center">
                <text size="small" weight="bold" color="#DAA520">Audience Results</text>
                <hstack
                  padding="small"
                  cornerRadius="small"
                  backgroundColor="#FDE68A"
                  alignment="middle center"
                  onPress={() => setShowAudienceResults(false)}
                >
                  <text size="small" weight="bold" color="#7C5C00">Hide</text>
                </hstack>
              </hstack>
              <vstack gap="small" width="100%">
                {audienceResults.map((percentage, index) => (
                  <hstack key={index.toString()} width="100%" gap="small" alignment="start">
                    <text size="small" width="30px" weight="bold" key={index.toString()}>
                      {String.fromCharCode(65 + index)}:
                    </text>
                    <vstack width="100%" gap="small">
                      <hstack width="100%" gap="small" alignment="start">
                        <vstack 
                          width={`${percentage}%`} 
                          height="20px" 
                          backgroundColor={index === currentQ.correctAnswer ? "#90EE90" : "#FF6B6B"}
                          cornerRadius="small"
                        />
                        <text size="small" weight="bold" width="40px">
                          {percentage.toString()}%
                        </text>
                      </hstack>
                    </vstack>
                  </hstack>
                ))}
              </vstack>
            </vstack>
          )}
          
          {/* Show explanation if available */}
          {lastAnswerExplanation && (
            <vstack gap="small" width="100%" padding="small" backgroundColor="#F0F8FF" cornerRadius="small">
              <text size="small" weight="bold" color="#0066CC">Explanation:</text>
              <text size="small" color="#333333">{lastAnswerExplanation}</text>
            </vstack>
          )}
        </vstack>
      );
    };

    const renderGameOver = () => (
      <vstack gap="medium" width="100%" alignment="center">
        <text size="xlarge" weight="bold">
          {gameStatus === 'won' ? 'CONGRATULATIONS!' : 
           gameStatus === 'lost' ? 'Game Over!' : 'Walked Away!'}
        </text>
        <text size="large">
          {gameStatus === 'won' ? `You won $1,000,000!` :
           gameStatus === 'lost' ? `You lost at question ${currentQuestion + 1}` :
           `You walked away with ${score}!`}
        </text>
        
        {/* Show final explanation if available */}
        {lastAnswerExplanation && (
          <vstack gap="small" width="100%" padding="small" backgroundColor="#F0F8FF" cornerRadius="small">
            <text size="small" weight="bold" color="#0066CC">Final Answer Explanation:</text>
            <text size="small" color="#333333">{lastAnswerExplanation}</text>
          </vstack>
        )}
        
                <button appearance="primary" onPress={async () => {
          // Update leaderboard with final score before resetting
          if (gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'walked') {
            try {
              const subreddit = await context.reddit.getCurrentSubreddit();
              await LeaderboardService.updateLeaderboard(context, subreddit.name, score);
            } catch (error) {
              console.error('Error updating leaderboard:', error);
            }
          }
          
          resetGame();
        }}>
          Play Again
        </button>
      </vstack>
    );



    const renderWalkAwayPrompt = () => (
      <vstack gap="medium" width="100%" alignment="center">
        <text size="large" weight="bold">Milestone Reached!</text>
        <text size="medium">
          You've secured {MONEY_LADDER[currentQuestion].amount}!
        </text>

        <text size="medium">Do you want to continue or walk away?</text>
        <hstack gap="medium">
          <button appearance="primary" onPress={continueGame}>
            Continue Playing
          </button>
          <button appearance="secondary" onPress={async () => {
            // Update leaderboard with current score before walking away
            try {
              const subreddit = await context.reddit.getCurrentSubreddit();
              await LeaderboardService.updateLeaderboard(context, subreddit.name, score);
            } catch (error) {
              console.error('Error updating leaderboard:', error);
            }
            
            walkAway();
          }}>
            Walk Away
          </button>
        </hstack>
      </vstack>
    );

    const renderLeaderboard = () => (
      <vstack gap="medium" width="100%" height="100%" alignment="center" padding="medium">
        <hstack width="100%" alignment="end middle" padding="none">
          <hstack 
            onPress={handleBackToStart} 
            padding="small" 
            cornerRadius="small"
            backgroundColor={COLORS.NEUTRAL_200}
            alignment="middle center"
          >
            <text size="large" color={COLORS.NEUTRAL_700}>✕</text>
          </hstack>
        </hstack>
        <vstack gap="none" width="100%" height="100%" padding="none">
          {leaderboardData.length > 0 ? (
            <vstack width="100%" gap="none">
              <hstack width="100%" padding="small">
                <text size="small" width="10%" color={COLORS.NEUTRAL_400} weight="bold">RANK</text>
                <text size="small" width="60%" color={COLORS.NEUTRAL_400} weight="bold">USER</text>
                <hstack width="30%" alignment="end">
                  <text size="small" color={COLORS.NEUTRAL_400} weight="bold">SCORE</text>
                </hstack>
              </hstack>
              {leaderboardData.map((entry, index) => (
                <hstack key={entry.userId} width="100%" padding="small">
                  <text size="medium" weight="bold" width="10%" color={COLORS.SECONDARY}>{index + 1}.</text>
                  <text size="medium" width="60%" color={COLORS.NEUTRAL_700}>u/{entry.userId}</text>
                  <hstack width="30%" alignment="end">
                    <text size="medium" weight="bold" color={COLORS.PRIMARY}>${entry.score.toLocaleString()}</text>
                  </hstack>
                </hstack>
              ))}
            </vstack>
          ) : (
            <vstack gap="small" width="100%" padding="medium" backgroundColor={COLORS.NEUTRAL_100} cornerRadius="small" alignment="center">
              <text size="medium" weight="bold" color={COLORS.NEUTRAL_600}>No scores yet!</text>
              <text size="small" color={COLORS.NEUTRAL_500} alignment="center">
                Leaderboard will be updated as games are played
              </text>
            </vstack>
          )}
        </vstack>
      </vstack>
    );

    const renderHowToPlay = () => (
      <vstack gap="medium" width="100%" height="100%" alignment="center" padding="medium">
        <hstack width="100%" alignment="end middle" padding="none">
          <hstack 
            onPress={handleBackToStart} 
            padding="small" 
            cornerRadius="small"
            backgroundColor={COLORS.NEUTRAL_200}
            alignment="middle center"
          >
            <text size="large" color={COLORS.NEUTRAL_700}>✕</text>
          </hstack>
        </hstack>
        <vstack gap="small" width="100%" maxHeight="60%">
          <text size="medium" weight="bold">Objective:</text>
          <text size="small">Answer 12 questions correctly to win $1,000,000!</text>
          
          <text size="medium" weight="bold">Money Ladder:</text>
          <text size="small">• Each correct answer moves you up the money ladder</text>
          <text size="small">• Milestone questions (★) let you walk away with guaranteed money</text>
          
          <text size="medium" weight="bold">Lifelines:</text>
          <text size="small">• 50:50 - Eliminates two wrong answers</text>
          <text size="small">• Ask Audience - Shows audience poll results</text>
          <text size="small">• Phone a Friend - Get a hint from a friend</text>
          
          <text size="medium" weight="bold">Game Over:</text>
          <text size="small">• One wrong answer and you lose everything!</text>
          <text size="small">• Use lifelines wisely to maximize your chances</text>
        </vstack>
      </vstack>
    );

    return (
      <zstack width="100%" height="100%">
      <image url={BGURL} imageWidth={1920} imageHeight={1080} width="100%" height="100%" resizeMode="cover" description="background" />
        <vstack height="100%" width="100%" padding="medium">
        {gameStatus === 'waiting' && !showLeaderboard && !showHowToPlay && (
          <vstack 
            gap="large" 
            width="100%" 
            height="100%" 
            alignment="center" 
            padding="large"
          >
            <vstack gap="medium" alignment="center">
              <text size="xxlarge" weight="bold" color={COLORS.NEUTRAL_100}>
                Reddionaire
              </text>
              <text size="large" color={COLORS.NEUTRAL_100} alignment="center">
                Test your knowledge with 12 questions and win up to
              </text>
              <text size="xxlarge" weight="bold" color={COLORS.ACCENT}>
                R$1,000,000
              </text>
            </vstack>

            <vstack gap="medium" width="100%" maxWidth="400px">
              <hstack 
                width={`${BUTTONS.BASE.WIDTH}%`}
                height={`${BUTTONS.BASE.HEIGHT}px`}
                backgroundColor={BUTTONS.PRIMARY.BACKGROUND}
                cornerRadius={BUTTONS.BASE.CORNER_RADIUS}
                onPress={startGame}
                alignment={BUTTONS.BASE.ALIGNMENT}
              >
                <text size={BUTTONS.BASE.TEXT_SIZE} color={BUTTONS.PRIMARY.TEXT}>Start Game</text>
              </hstack>
              <hstack 
                width={`${BUTTONS.BASE.WIDTH}%`}
                height={`${BUTTONS.BASE.HEIGHT}px`}
                backgroundColor={BUTTONS.SECONDARY.BACKGROUND}
                cornerRadius={BUTTONS.BASE.CORNER_RADIUS}
                alignment={BUTTONS.BASE.ALIGNMENT}
                onPress={async () => {
              try {
                const subreddit = await context.reddit.getCurrentSubreddit();
                const leaderboard = await LeaderboardService.getLeaderboard(context, subreddit.name);
                setLeaderboardData(leaderboard);
                setShowLeaderboard(true);
                setShowHowToPlay(false);
              } catch (error) {
                console.error('Error loading leaderboard:', error);
                setLeaderboardData([]);
                setShowLeaderboard(true);
                setShowHowToPlay(false);
              }
            }} 
          >
            <hstack alignment="center" gap={BUTTONS.SECONDARY.ICON.GAP}>
              <text size={BUTTONS.BASE.TEXT_SIZE}>{BUTTONS.SECONDARY.ICON.TYPE}</text>
              <text size={BUTTONS.BASE.TEXT_SIZE} color={BUTTONS.SECONDARY.TEXT}>Leaderboard</text>
            </hstack>
          </hstack>
          <hstack 
            width={`${BUTTONS.BASE.WIDTH}%`}
            height={`${BUTTONS.BASE.HEIGHT}px`}
            backgroundColor={BUTTONS.ACCENT.BACKGROUND}
            cornerRadius={BUTTONS.BASE.CORNER_RADIUS}
            alignment={BUTTONS.BASE.ALIGNMENT}
            onPress={handleShowHowToPlay}
          >
            <text size={BUTTONS.BASE.TEXT_SIZE} color={BUTTONS.ACCENT.TEXT}>How to Play</text>
          </hstack>
        </vstack>
      </vstack>
    )}

        {showLeaderboard && renderLeaderboard()}
        {showHowToPlay && renderHowToPlay()}

        {gameStatus === 'playing' && gameQuestions.length > 0 && !showWalkAway && (
          <vstack width="100%" height="100%" padding="medium" gap="medium">
            <hstack width="100%" gap="medium" alignment="start">
              <vstack width="70%" gap="medium" alignment="center">
                {renderQuestion()}
                {renderLifelines()}
              </vstack>
              <vstack width="30%" gap="small">
                {renderMoneyLadder()}
              </vstack>
            </hstack>
          </vstack>
        )}

        {showWalkAway && renderWalkAwayPrompt()}
        
        {(gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'walked') && 
          renderGameOver()}
        </vstack>
      </zstack>
    );
  },
});

export default Devvit;
