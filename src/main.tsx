// Learn more at developers.reddit.com/docs
import { Devvit, useState, TriggerContext } from "@devvit/public-api";
import questionsData from "./questions.json" with { type: "json" };
import { LeaderboardService } from "./server.js";
import { colors, typography, buttons, gameUI, page } from "./theme.js";

Devvit.configure({
  redditAPI: true,
  redis: true,
});

const BGURL = "app_bg_v2.jpg";

// Game constants
const MONEY_LADDER = [
  { question: 1, amount: "100,000", milestone: false },
  { question: 2, amount: "150,000", milestone: false },
  { question: 3, amount: "200,000", milestone: false },
  { question: 4, amount: "250,000", milestone: true },
  { question: 5, amount: "300,000", milestone: false },
  { question: 6, amount: "400,000", milestone: false },
  { question: 7, amount: "500,000", milestone: false },
  { question: 8, amount: "600,000", milestone: true },
  { question: 9, amount: "700,000", milestone: false },
  { question: 10, amount: "800,000", milestone: false },
  { question: 11, amount: "850,000", milestone: false },
  { question: 12, amount: "1,000,000", milestone: true },
];

// Question rotation system - rotates on every gameplay session
const getQuestionsForGame = (subredditId: string): typeof questionsData.questions => {
  // Create a session seed with timestamp, random number, and subreddit for truly unique questions each game
  const sessionSeed = `${Date.now()}_${Math.random()}_${subredditId}`;
  
  // Simple hash function for consistent seeding
  let hash = 0;
  for (let i = 0; i < sessionSeed.length; i++) {
    const char = sessionSeed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use the hash to shuffle questions consistently with better randomization
  const shuffledQuestions = [...questionsData.questions].sort(() => {
    hash = (hash * 9301 + 49297) % 233280;
    return (hash / 233280) - 0.5;
  });
  
  // Select questions with progression: easy -> medium -> hard (random selection from each tier)
  const questionsPerGame = questionsData.metadata.questionsPerGame;
  const selectedQuestions: typeof questionsData.questions = [];
  
  // Separate questions by difficulty (already shuffled, so random selection)
  const easyQuestions = shuffledQuestions.filter(q => q.difficulty === "easy");
  const mediumQuestions = shuffledQuestions.filter(q => q.difficulty === "medium");
  const hardQuestions = shuffledQuestions.filter(q => q.difficulty === "hard");
  
  // Progressive difficulty: first 4 questions easy, next 4 medium, last 4 hard
  const easyCount = Math.min(4, questionsPerGame);
  const mediumCount = Math.min(4, Math.max(0, questionsPerGame - 4));
  const hardCount = Math.max(0, questionsPerGame - 8);
  
  // Add random questions from each difficulty tier in progression order
  // Shuffle each difficulty tier separately to get different random selections
  const shuffledEasy = [...easyQuestions].sort(() => {
    hash = (hash * 9301 + 49297) % 233280;
    return (hash / 233280) - 0.5;
  });
  const shuffledMedium = [...mediumQuestions].sort(() => {
    hash = (hash * 9301 + 49297) % 233280;
    return (hash / 233280) - 0.5;
  });
  const shuffledHard = [...hardQuestions].sort(() => {
    hash = (hash * 9301 + 49297) % 233280;
    return (hash / 233280) - 0.5;
  });
  
  selectedQuestions.push(...shuffledEasy.slice(0, easyCount));
  selectedQuestions.push(...shuffledMedium.slice(0, mediumCount));
  selectedQuestions.push(...shuffledHard.slice(0, hardCount));
  
  // If we don't have enough questions, add from fallback
  if (selectedQuestions.length < questionsPerGame) {
    const fallbackQuestions = questionsData.rotationRules.fallbackQuestions.map(id => 
      questionsData.questions.find(q => q.id === id)
    ).filter(Boolean) as typeof questionsData.questions;
     
    selectedQuestions.push(...fallbackQuestions.slice(0, questionsPerGame - selectedQuestions.length));
  }
  
  // Randomize the position of the correct answer for each question
  const finalQuestions = selectedQuestions.slice(0, questionsPerGame).map((question, questionIndex) => {
    // Create a copy of the question
    const shuffledQuestion = { ...question };
    
    // Create array of indices [0, 1, 2, 3]
    const indices = [0, 1, 2, 3];
    
    // Create a unique hash for each question to ensure different shuffling
    let questionHash = hash + questionIndex * 1000;
    const shuffledIndices = indices.sort(() => {
      questionHash = (questionHash * 9301 + 49297) % 233280;
      return (questionHash / 233280) - 0.5;
    });
    
    // Create new options array with shuffled order
    const newOptions = shuffledIndices.map(index => question.options[index]);
    
    // Find the new position of the correct answer
    const newCorrectAnswer = shuffledIndices.indexOf(question.correctAnswer);
    
    // Update the question with shuffled options and new correct answer position
    shuffledQuestion.options = newOptions;
    shuffledQuestion.correctAnswer = newCorrectAnswer;
    
    return shuffledQuestion;
  });
  
  return finalQuestions;
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
    const [score, setScore] = useState<string>("0");
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
        // Get subreddit info for question rotation
        let subredditId = 'default';
        
        try {
          const subreddit = await context.reddit.getCurrentSubreddit();
          subredditId = subreddit.name;
        } catch (e) {
          console.warn('Could not get subreddit, using default:', e);
        }
        
        // Generate questions for this game session
        const questions = getQuestionsForGame(subredditId);
        setGameQuestions(questions);
        
        setCurrentQuestion(0);
        setScore("0");
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
            // console.log(`Question ${currentQuestion + 1} milestone check:`, isMilestone);
            if (isMilestone) {
              // console.log('Setting showWalkAway to true');
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
      
      // Base percentages by difficulty with balanced variance
      let correctPercentage: number;
      if (difficulty === 'easy') {
        correctPercentage = 50 + Math.floor(seededRandom() * 30); // 50-80%
      } else if (difficulty === 'medium') {
        correctPercentage = 35 + Math.floor(seededRandom() * 35); // 35-70%
      } else {
        correctPercentage = 20 + Math.floor(seededRandom() * 40); // 20-60%
      }
      
      // Add moderate noise (±15-20 points total)
      const noise = (seededRandom() - 0.5) * 20;
      correctPercentage = Math.max(5, Math.min(85, correctPercentage + noise));
      
      // Calculate remaining percentage for wrong answers
      const remainingPercentage = 100 - correctPercentage;
      const wrongOptions = [0, 1, 2, 3].filter(index => index !== correctAnswer);
      
      // Distribute remaining percentage across wrong options with some variation
      const wrongPercentages: number[] = [];
      let totalWrong = 0;
      
      for (let i = 0; i < wrongOptions.length; i++) {
        const basePercentage = remainingPercentage / wrongOptions.length;
        const variation = (seededRandom() - 0.5) * 30; // ±15% variation
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
      setScore("0");
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
          size={gameUI.moneyLadder.header.size} 
          weight={gameUI.moneyLadder.header.weight} 
          color={gameUI.moneyLadder.header.color}
        >
          Money Ladder
        </text>

        {/* Amount row */}
        <hstack gap="small" alignment="start">
          <hstack 
            width="70%"
            backgroundColor={colors.moneyLadderBg}
            cornerRadius={gameUI.moneyLadder.container.cornerRadius}
            padding={gameUI.moneyLadder.container.padding}
          >
            <hstack gap="small" alignment="middle center">
              <image url="reddionaire-icon.png" imageWidth={24} imageHeight={24} width="24px" height="24px" resizeMode="contain" description="Reddionaire icon" />
              <text size="xlarge" weight="bold" color={colors.neutral100}>
                R${MONEY_LADDER[currentQuestion].amount}
              </text>
            </hstack>
          </hstack>
        </hstack>

        {/* Milestone label on its own line */}
        {MONEY_LADDER[currentQuestion].milestone && (
          <text size="small" color={colors.neutral100}>Milestone</text>
        )}
      </vstack>
    );

    const renderLifelines = () => (
      <vstack gap="small" width="100%">
        <text size="small" weight="bold" alignment="center" color={colors.neutral100}>Lifelines</text>
        <hstack gap={gameUI.lifelines.button.gap} width="100%" alignment="middle center">
          <hstack 
            width={`${gameUI.lifelines.button.width}px`}
            height={`${gameUI.lifelines.button.height}px`}
            padding={gameUI.lifelines.button.padding}
            backgroundColor={fiftyFifty ? colors.lifeline5050 : colors.neutral400}
            cornerRadius={gameUI.lifelines.button.cornerRadius}
            size={gameUI.lifelines.button.textSize}
            weight={gameUI.lifelines.button.textWeight}
            alignment="middle center"
            onPress={() => { if (fiftyFifty) useLifeline('fiftyFifty'); }}
          >
            <text size="medium" weight="bold" color={colors.neutral100}>50:50</text>
          </hstack>
          <hstack 
            width={`${gameUI.lifelines.button.width}px`}
            height={`${gameUI.lifelines.button.height}px`}
            backgroundColor={askAudience ? colors.lifelineAsk : colors.neutral400}
            cornerRadius={gameUI.lifelines.button.cornerRadius}
            alignment="middle center"
            onPress={() => { if (askAudience) useLifeline('askAudience'); }}
          >
            <text size="medium" weight="bold" color={colors.neutral900}>Ask</text>
          </hstack>
          <hstack 
            width={`${gameUI.lifelines.button.width}px`}
            height={`${gameUI.lifelines.button.height}px`}
            backgroundColor={phoneFriend ? colors.lifelineCall : colors.neutral400}
            cornerRadius={gameUI.lifelines.button.cornerRadius}
            alignment="middle center"
            onPress={() => { if (phoneFriend) useLifeline('phoneFriend'); }}
          >
            <text size="medium" weight="bold" color={colors.neutral100}>Call</text>
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
            backgroundColor={gameUI.question.container.background}
            cornerRadius={gameUI.question.container.cornerRadius}
          >
            {/* Move padding to an inner wrapper so the card looks like it sits behind the text */}
            <vstack padding={gameUI.question.container.padding} gap="small" alignment="start">
              <hstack
                backgroundColor={gameUI.question.header.background}
                cornerRadius={gameUI.question.header.cornerRadius}
                padding={gameUI.question.header.padding}
              >
                <text size={typography.paragraph.textSize} color={gameUI.question.header.textColor}>
                  Question {currentQuestion + 1}
                  </text>
              </hstack>
              <text size={typography.heading3.textSize} weight={typography.heading3.textWeight} color={colors.questionText} wrap={true}>
                {currentQ.question}
              </text>
            </vstack>
          </vstack>
          <vstack gap={gameUI.answers.button.gap} width="100%">
            {currentQ.options.map((option, index) => (
              <hstack
                key={index.toString()}
                width="100%"
                height={`${gameUI.answers.button.height}px`}
                backgroundColor={hiddenOptions.includes(index) ? gameUI.answers.button.disabledColor : gameUI.answers.button.background}
                cornerRadius={gameUI.answers.button.cornerRadius}
                padding={gameUI.answers.button.padding}
                onPress={() => { if (!hiddenOptions.includes(index)) answerQuestion(index); }}
                alignment="middle center"
              >
                <hstack width={`${gameUI.answers.button.prefix.width}px`} alignment="middle center">
                  <text size={gameUI.answers.button.textSize} weight={gameUI.answers.button.prefix.weight} color={gameUI.answers.button.textColor}>
                    {String.fromCharCode(65 + index)}.
                  </text>
                </hstack>
                <text size={gameUI.answers.button.textSize} color={gameUI.answers.button.textColor}>
                  {option}
                </text>
              </hstack>
            ))}
          </vstack>
          
          
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
      <vstack gap="large" width="100%" height="100%" alignment="center" padding="large">
        <vstack gap="medium" alignment="center">
          <text size="xxlarge" weight="bold" color={colors.neutral100}>
            {gameStatus === 'won' ? 'CONGRATULATIONS!' : gameStatus === 'lost' ? 'Game Over!' : 'You Walked Away!'}
          </text>
          <text size="large" color={colors.neutral100} alignment="center">
            {gameStatus === 'won' ? `You won $1,000,000!` :
             gameStatus === 'lost' ? `You lost at question ${currentQuestion + 1}` :
             `You walked away with R$${score}!`}
          </text>
        </vstack>

        {lastAnswerExplanation && gameStatus !== 'won' && (
          <vstack gap="small" width="100%" maxWidth="600px" padding="medium" backgroundColor={colors.neutral100} cornerRadius="small">
            <text size="small" weight="bold" color={colors.questionText}>Final Answer Explanation:</text>
            <text size="small" color={colors.neutral700} alignment="start">{lastAnswerExplanation}</text>
          </vstack>
        )}
        
        {gameStatus === 'won' && (
          <vstack gap="small" width="100%" maxWidth="600px" padding="medium" backgroundColor={colors.neutral100} cornerRadius="small">
            <text size="small" weight="bold" color={colors.success}>You successfully answered all the correct questions!</text>
          </vstack>
        )}

        <vstack gap="medium" width="100%" maxWidth="400px">
          <hstack 
            width={`${buttons.base.width}%`}
            height={`${buttons.base.height}px`}
            backgroundColor={buttons.primary.background}
            cornerRadius={buttons.base.cornerRadius}
            onPress={async () => {
              if (gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'walked') {
                try {
                  const subreddit = await context.reddit.getCurrentSubreddit();
                  console.log('Updating leaderboard with score:', score);
                  await LeaderboardService.updateLeaderboard(context, subreddit.name, score);
                } catch (error) {
                  console.error('Error updating leaderboard:', error);
                }
              }
              resetGame();
            }}
            alignment={buttons.base.alignment}
          >
            <text size={buttons.base.textSize} weight={buttons.base.textWeight} color={buttons.primary.text}>Play Again</text>
          </hstack>
        </vstack>
      </vstack>
    );



    const renderWalkAwayPrompt = () => (
      <vstack gap="large" width="100%" height="100%" alignment="center" padding="large">
        <vstack gap="medium" alignment="center">
          <text size="xxlarge" weight="bold" color={colors.neutral100}>
            Milestone Reached!
          </text>
          <text size="large" color={colors.neutral100} alignment="center">
            You've secured R${MONEY_LADDER[currentQuestion].amount}!
          </text>
          <text size="medium" color={colors.neutral100} alignment="center">
            Do you want to continue or walk away?
          </text>
        </vstack>

        <vstack gap="medium" width="100%" maxWidth="400px">
          <hstack 
            width={`${buttons.base.width}%`}
            height={`${buttons.base.height}px`}
            backgroundColor={buttons.primary.background}
            cornerRadius={buttons.base.cornerRadius}
            onPress={continueGame}
            alignment={buttons.base.alignment}
          >
            <text size={buttons.base.textSize} weight={buttons.base.textWeight} color={buttons.primary.text}>Continue Playing</text>
          </hstack>
          <hstack 
            width={`${buttons.base.width}%`}
            height={`${buttons.base.height}px`}
            backgroundColor={buttons.secondary.background}
            cornerRadius={buttons.base.cornerRadius}
            onPress={async () => {
              // Update leaderboard with current score before walking away
              try {
                const subreddit = await context.reddit.getCurrentSubreddit();
                console.log('Updating leaderboard with score (walk away):', score);
                await LeaderboardService.updateLeaderboard(context, subreddit.name, score);
              } catch (error) {
                console.error('Error updating leaderboard:', error);
              }
              
              walkAway();
            }}
            alignment={buttons.base.alignment}
          >
            <text size={buttons.base.textSize} weight={buttons.base.textWeight} color={buttons.secondary.text}>Walk Away</text>
          </hstack>
        </vstack>
      </vstack>
    );

    const renderLeaderboard = () => (
      <vstack gap="medium" width="100%" height="100%" alignment="center" padding="medium">
        <hstack width="100%" alignment="start middle" padding="none">
          <hstack width="80%" alignment="start middle" padding="none">
            <image url="leaderboard.png" width={`${page.header.title.width}px`} height={`${page.header.title.height}px`} resizeMode="contain" description="Leaderboard title" />
          </hstack>
          <hstack width="20%" alignment="end middle" padding="none">
            <hstack 
              onPress={handleBackToStart} 
              alignment="middle center"
            >
              <image url="close.png" imageWidth={30} imageHeight={30} width="30px" height="30px" resizeMode="contain" description="Close" />
            </hstack>
          </hstack>
        </hstack>
        <vstack gap="none" width="100%" height="100%" padding="none">
          {leaderboardData.length > 0 ? (
            <vstack width="100%" gap="none">
              <hstack width="100%" padding="small">
                <text size="small" width="10%" color={colors.neutral400} weight="bold">RANK</text>
                <text size="small" width="60%" color={colors.neutral400} weight="bold">USER</text>
                <hstack width="30%" alignment="end">
                  <text size="small" color={colors.neutral400} weight="bold">SCORE</text>
                </hstack>
              </hstack>
              {leaderboardData.map((entry, index) => (
                <hstack key={entry.userId} width="100%" padding="small">
                  <text size="medium" weight="bold" width="10%" color={colors.secondary}>{index + 1}.</text>
                  <text size="medium" width="60%" color={colors.neutral700}>u/{entry.userId}</text>
                  <hstack width="30%" alignment="end">
                    <text size="medium" weight="bold" color={colors.primary}>R${entry.score}</text>
                  </hstack>
                </hstack>
              ))}
            </vstack>
          ) : (
            <vstack gap="large" width="100%" padding="medium" alignment="center">
              <vstack gap="small">
                <text size="xxlarge" weight="bold" color={colors.accent} alignment="center">No scores yet!</text>
                <vstack gap="none" alignment="center">
                  <text size="xxlarge" weight="bold" color={colors.accent} alignment="center">
                    Leaderboard will be updated as
                  </text>
                  <text size="xxlarge" weight="bold" color={colors.accent} alignment="center">
                    games are played
                  </text>
                </vstack>
              </vstack>
              <vstack gap="medium" width="100%" maxWidth="400px">
              <hstack
                width={`${buttons.base.width}%`}
                height={`${buttons.base.height}px`}
                backgroundColor={buttons.primary.background}
                cornerRadius={buttons.base.cornerRadius}
                onPress={startGame}
                alignment={buttons.base.alignment}
              >
                <text size={buttons.base.textSize} weight={buttons.base.textWeight} color={buttons.primary.text}>Start Game</text>
              </hstack>
              </vstack>
            </vstack>
          )}
        </vstack>
      </vstack>
    );

    const renderHowToPlay = () => (
      <vstack gap="medium" width="100%" height="100%" alignment="center" padding="medium">
       <hstack width="100%" alignment="start middle" padding="none">
          <hstack width="80%" alignment="start middle" padding="none">
            <image url="how-to-play.png" width={`${page.header.title.width}px`} height={`${page.header.title.height}px`} resizeMode="contain" description="How to Play title" />
          </hstack>
          <hstack width="20%" alignment="end middle" padding="none">
            <hstack 
              onPress={handleBackToStart} 
              alignment="middle center"
            >
              <image url="close.png" imageWidth={30} imageHeight={30} width="30px" height="30px" resizeMode="contain" description="Close" />
            </hstack>
          </hstack>
        </hstack>
        <vstack gap="medium" width="100%">
          <vstack gap="small" width="100%" padding="medium" backgroundColor={colors.questionBackground} cornerRadius="small">
            <text size={typography.heading3.textSize} weight={typography.heading3.textWeight} color={colors.questionText}>Objective</text>
            <text size={typography.paragraph.textSize} color={colors.questionText} wrap={true}>Answer 12 questions correctly to win the grand prize of R$1,000,000!</text>
          </vstack>
          
          <vstack gap="small" width="100%" padding="medium" backgroundColor={colors.questionBackground} cornerRadius="small">
            <text size={typography.heading3.textSize} weight={typography.heading3.textWeight} color={colors.questionText}>Money Ladder</text>
            <text size={typography.paragraph.textSize} color={colors.questionText} wrap={true}>• Each correct answer moves you up the money ladder</text>
            <text size={typography.paragraph.textSize} color={colors.questionText} wrap={true}>• Milestone questions (★) let you walk away with guaranteed money</text>
          </vstack>
          
          <vstack gap="small" width="100%" padding="medium" backgroundColor={colors.questionBackground} cornerRadius="small">
            <text size={typography.heading3.textSize} weight={typography.heading3.textWeight} color={colors.questionText}>Lifelines</text>
            <text size={typography.paragraph.textSize} color={colors.questionText} wrap={true}>• 50:50 - Eliminates two wrong answers</text>
            <text size={typography.paragraph.textSize} color={colors.questionText} wrap={true}>• Ask Audience - Shows audience poll results</text>
            <text size={typography.paragraph.textSize} color={colors.questionText} wrap={true}>• Phone a Friend - Get a hint from a friend</text>
          </vstack>
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
            padding="large">
            <vstack gap="medium" alignment="center">
              <image url="logo.png" imageWidth={225} imageHeight={53} width="225px" height="53px" resizeMode="contain" description="Reddionaire logo" />
                <vstack alignment="center">
                  <text size="large" weight="bold" color={colors.accent} alignment="center">
                    Test your knowledge with 12  
                  </text>
                  <text size="large" weight="bold" color={colors.accent} alignment="center">
                  questions and win up to
                  </text>
                </vstack>
                 <image url="reddionaire-jackpot.png" imageWidth={125} imageHeight={25} width="125px" height="25px" resizeMode="contain" description="R$1,000,000 jackpot" />
            </vstack>
            <vstack gap="medium" width="100%" maxWidth="400px">
              <hstack 
                width={`${buttons.base.width}%`}
                height={`${buttons.base.height}px`}
                backgroundColor={buttons.primary.background}
                cornerRadius={buttons.base.cornerRadius}
                onPress={startGame}
                alignment={buttons.base.alignment}
              >
                <text size={buttons.base.textSize} weight={buttons.base.textWeight} color={buttons.primary.text}>Start Game</text>
              </hstack>
              <hstack 
                width={`${buttons.base.width}%`}
                height={`${buttons.base.height}px`}
                backgroundColor={buttons.secondary.background}
                cornerRadius={buttons.base.cornerRadius}
                alignment={buttons.base.alignment}
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
            <hstack alignment="center" gap={buttons.secondary.icon.gap}>
              <image url="leaderboard-icon.png" imageWidth={20} imageHeight={20} width="20px" height="20px" resizeMode="contain" description="Leaderboard icon" />
              <text size={buttons.base.textSize} weight={buttons.base.textWeight} color={buttons.secondary.text}>Leaderboard</text>
            </hstack>
          </hstack>
          <hstack 
            width={`${buttons.base.width}%`}
            height={`${buttons.base.height}px`}
            backgroundColor={buttons.accent.background}
            cornerRadius={buttons.base.cornerRadius}
            alignment={buttons.base.alignment}
            onPress={handleShowHowToPlay}
          >
            <text size={buttons.base.textSize} weight={buttons.base.textWeight} color={buttons.accent.text}>How to Play</text>
          </hstack>
        </vstack>
      </vstack>
    )}

        {showLeaderboard && renderLeaderboard()}
        {showHowToPlay && renderHowToPlay()}

        {gameStatus === 'playing' && gameQuestions.length > 0 && !showWalkAway && (
          <vstack width="100%" height="100%" padding="medium" gap="medium">
            {renderMoneyLadder()}
            <vstack width="100%" gap="medium" alignment="center">
              {renderQuestion()}
              {renderLifelines()}
            </vstack>
            
            {/* Show audience results if available */}
            {showAudienceResults && audienceResults.length > 0 && gameQuestions.length > 0 && (
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
                      {audienceResults.map((percentage, index) => {
                        const currentQ = gameQuestions[currentQuestion];
                        return (
                          <hstack key={index.toString()} width="100%" gap="small" alignment="start">
                            <text size="small" width="25px" weight="bold" key={index.toString()}>
                              {String.fromCharCode(65 + index)}:
                            </text>
                            <vstack width="100%" gap="small">
                              <hstack width="100%" gap="small" alignment="start">
                                <vstack 
                                  width={`${Math.min(percentage, 60)}%`} 
                                  height="15px" 
                                  backgroundColor={index === currentQ.correctAnswer ? "#90EE90" : "#FF6B6B"}
                                  cornerRadius="small"
                                />
                                <text size="small" weight="bold" width="40px">
                                  {percentage.toString()}%
                                </text>
                              </hstack>
                            </vstack>
                          </hstack>
                        );
                      })}
                    </vstack>
                  </vstack>
                )}
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
