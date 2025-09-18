// Learn more at developers.reddit.com/docs
import { Devvit, useState, useInterval, TriggerContext, svg } from "@devvit/public-api";
import questionsData from "./questions.json" with { type: "json" };
import { LeaderboardService } from "./server.js";
import { colors, typography, buttons, card, table, gameUI, page } from "./theme.js";

Devvit.configure({
  redditAPI: true,
  redis: true,
});

const bgUrl = "app_bg_v2.jpg";

const moneyLadder = [
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

const friends = [
  { name: "Alex", catchphrase: "I've got a helpful hint for you! Let me share what I know about this topic." },
  { name: "Sam", catchphrase: "I remember studying this! Here's a clue that might help you figure it out." },
  { name: "Jordan", catchphrase: "I know this one! Let me give you a hint that should point you in the right direction." },
  { name: "Casey", catchphrase: "This is a tricky question, but I have a useful hint that might help you solve it." },
  { name: "Riley", catchphrase: "I've got just the hint you need! This should make the answer much clearer." }
];

const getQuestionsForGame = (subredditId: string): typeof questionsData.questions => {
  // Create a more robust session seed for better randomization
  const sessionSeed = `${Date.now()}_${Math.random()}_${subredditId}_${Math.random()}`;
  
  // Improved hash function using multiple passes for better distribution
  let hash = 0;
  for (let i = 0; i < sessionSeed.length; i++) {
    const char = sessionSeed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Fisher-Yates shuffle implementation for true randomization
  const shuffleArray = (array: any[], seed: number): any[] => {
    // Filter out any undefined/null items first
    const validArray = array.filter(item => item != null);
    const shuffled = [...validArray];
    let currentSeed = seed;
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Generate random index using linear congruential generator
      currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
      const j = Math.floor((currentSeed / 4294967296) * (i + 1));
      
      // Swap elements
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  };
  
  // Ensure we have valid questions data
  if (!questionsData || !questionsData.questions || !Array.isArray(questionsData.questions)) {
    console.error('Invalid questions data structure');
    return [];
  }
  
  // Shuffle all questions first for maximum randomization
  const shuffledQuestions = shuffleArray(questionsData.questions, hash);
  
  // Select questions with progression: easy -> medium -> hard (random selection from each tier)
  const questionsPerGame = questionsData.metadata.questionsPerGame;
  const selectedQuestions: typeof questionsData.questions = [];
  
  // Separate questions by difficulty - filter out any undefined items first
  const validQuestions = shuffledQuestions.filter(q => q && q.difficulty);
  const easyQuestions = validQuestions.filter(q => q.difficulty === "easy");
  const mediumQuestions = validQuestions.filter(q => q.difficulty === "medium");
  const hardQuestions = validQuestions.filter(q => q.difficulty === "hard");
  
  // Progressive difficulty: first 4 questions easy, next 4 medium, last 4 hard
  const easyCount = Math.min(4, questionsPerGame);
  const mediumCount = Math.min(4, Math.max(0, questionsPerGame - 4));
  const hardCount = Math.max(0, questionsPerGame - 8);
  
  // Shuffle each difficulty tier separately with different seeds for better distribution
  const shuffledEasy = shuffleArray(easyQuestions, hash + 1000);
  const shuffledMedium = shuffleArray(mediumQuestions, hash + 2000);
  const shuffledHard = shuffleArray(hardQuestions, hash + 3000);
  
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
  const finalQuestions = selectedQuestions.slice(0, questionsPerGame).filter(question => question && question.options).map((question, questionIndex) => {
    // Create a copy of the question
    const shuffledQuestion = { ...question };
    
    // Create array of indices [0, 1, 2, 3]
    const indices = [0, 1, 2, 3];
    
    // Use Fisher-Yates shuffle for option randomization too
    const shuffledIndices = shuffleArray(indices, hash + questionIndex * 10000);
    
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
    title: "Who Wants to Be a Reddionaire? - Test Your Knowledge!",
    subredditName: subreddit.name,
    preview: (
      <zstack width="100%" height="100%">
        <image url={bgUrl} imageWidth={1920} imageHeight={1080} width="100%" height="100%" resizeMode="cover" description="background" />
        <vstack height="100%" width="100%" alignment="middle center" padding="large" gap="large">
          <vstack gap="medium" alignment="center">
            <image url="logo.png" imageWidth={225} imageHeight={53} width="225px" height="53px" resizeMode="contain" description="Reddionaire logo" />
            <vstack alignment="center" gap="small">
              <text size="large" weight="bold" color={colors.accent} alignment="center">
                Test your knowledge with 12  
              </text>
              <text size="large" weight="bold" color={colors.accent} alignment="center">
                questions and win up to
              </text>
            </vstack>
            <image url="reddionaire-jackpot.png" imageWidth={125} imageHeight={25} width="125px" height="25px" resizeMode="contain" description="R$1,000,000 jackpot" />
          </vstack>
          
          <vstack gap="medium" width="100%" maxWidth="300px" alignment="center">
            {/* <text size="medium" weight="bold" color={colors.white} alignment="center">
              Reddionaire Game Loading...
            </text>  */}
            
            {/* Progress Bar */}
            <vstack width="100%" gap="small">
              <hstack width="100%" height="8px" backgroundColor={colors.darkestPurple} cornerRadius="small">
                <hstack width="60%" height="100%" backgroundColor={colors.accent} cornerRadius="small" />
              </hstack>
              {/* <text size="small" color={colors.white} alignment="center">Loading questions...</text> */}
            </vstack>
          </vstack>
        </vstack>
      </zstack>
    ),
  });

  return post;
};

Devvit.addMenuItem({
  label: "Start Reddionaire Game",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    ui.showToast(
      "Starting Reddionaire game - you'll be redirected to the game post!"
    );

    const post = await createPost(context);

    ui.navigateTo(post);
  },
});

// Devvit.addMenuItem({
//   label: "Debug: Show BG URL",
//   location: "subreddit",
//   forUserType: "moderator",
//   onPress: async (_event, context) => {
//     try {
//       const url = await context.assets.getURL(bgUrl);
//       context.ui.showToast(url ?? "(no URL returned)");
//     } catch (e) {
//       context.ui.showToast(`assets.getURL error: ${String(e)}`);
//     }
//   },
// });

Devvit.addTrigger({
  events: ["AppInstall"],
  onEvent: async (event, context) => {
    await createPost(context);
  },
});

Devvit.addCustomPostType({
  name: "Reddionaire Game",
  height: "tall",
  render: (context) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState<string>("0");
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'won' | 'lost' | 'walked'>('waiting');
    const [fiftyFifty, setFiftyFifty] = useState(true);
    const [askAudience, setAskAudience] = useState(true);
    const [phoneFriend, setPhoneFriend] = useState(true);
    const [showHint, setShowHint] = useState<boolean>(false);
    const [currentFriend, setCurrentFriend] = useState<{name: string, catchphrase: string} | null>(null);
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
    
    const [timeLeft, setTimeLeft] = useState<number>(30); // 30 seconds per question
    const [timerActive, setTimerActive] = useState<boolean>(false);
    const [timedOut, setTimedOut] = useState<boolean>(false);
        const timerInterval = useInterval(() => {
      if (timerActive && timeLeft > 0) {
        setTimeLeft(prev => prev - 1);
      } else if (timerActive && timeLeft <= 0) {
        // Time's up - handle timeout
        setTimerActive(false);
        handleTimeUp();
      }
    }, 1000);

    const handleTimeUp = () => {
      // Time's up - game over
      setTimedOut(true);
      if (gameQuestions.length > 0) {
        const currentQ = gameQuestions[currentQuestion];
        const correctAnswer = currentQ.options[currentQ.correctAnswer];
        setLastAnswerExplanation(`The correct answer was: ${correctAnswer}. ${currentQ.explanation || ""}`);
      } else {
        setLastAnswerExplanation("");
      }
      setGameStatus('lost');
    };

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
        
        // Initialize timer
        setTimeLeft(300000);
        setTimerActive(true);
        setTimedOut(false);
        timerInterval.start();
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
      
      // Stop the timer when an answer is selected
      setTimerActive(false);
      timerInterval.stop();
      
      const currentQ = gameQuestions[currentQuestion];
      const isCorrect = selectedAnswer === currentQ.correctAnswer;
      
      if (isCorrect) {
          const newScore = moneyLadder[currentQuestion].amount;
          const nextQuestion = currentQuestion + 1;
          
          // Set explanation for correct answer
          setLastAnswerExplanation(currentQ.explanation || "Correct answer!");
          
          if (nextQuestion >= gameQuestions.length) {
            // Won the game!
            setScore(newScore);
            setGameStatus('won');

          } else {
            // Check if the CURRENT question they just answered is a milestone
            const isMilestone = moneyLadder[currentQuestion].milestone;
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
            setShowHint(false); // Hide hint for new question
            
            // Reset and start timer for next question
            setTimeLeft(30);
            setTimerActive(true);
            timerInterval.start();
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
      // Restart timer when continuing after milestone
      setTimeLeft(30);
      setTimerActive(true);
      timerInterval.start();
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
        // Select a random friend and show their hint
        const randomFriend = friends[Math.floor(Math.random() * friends.length)];
        setCurrentFriend(randomFriend);
        setShowHint(true);
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
      setShowHint(false);
      setCurrentFriend(null);
      
      // Stop timer and reset
      setTimerActive(false);
      timerInterval.stop();
      setTimeLeft(30);
      setTimedOut(false);
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
      <hstack gap="small" width="100%">
        <hstack gap="small" alignment="start" width="60%">
          <hstack 
            backgroundColor={gameUI.moneyLadder.container.background}
            cornerRadius={gameUI.moneyLadder.container.cornerRadius}
            width={`${gameUI.moneyLadder.container.width}px`}
            height={`${gameUI.moneyLadder.container.height}px`}
            padding={gameUI.moneyLadder.container.padding}
          >
            <hstack gap="small" alignment="middle center">
              <image url="reddionaire-icon.png" imageWidth={24} imageHeight={24} width="24px" height="24px" resizeMode="contain" description="Reddionaire icon" />
              <text size={gameUI.moneyLadder.container.textSize} weight={gameUI.moneyLadder.container.textWeight} color={gameUI.moneyLadder.container.textColor}>R${moneyLadder[currentQuestion].amount}</text>
            </hstack>
          </hstack>
          
          {moneyLadder[currentQuestion].milestone && (
            <vstack alignment="middle center" padding="small">
              <text size={gameUI.moneyLadder.milestone.textSize} color={gameUI.moneyLadder.milestone.textColor}>Milestone</text>
            </vstack>
          )}
        </hstack>
        
          {gameStatus === 'playing' && (
            <hstack width="40%">
              <hstack gap="small" alignment="middle end" width="100%">
                <image 
                  url={svg`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ffffff" viewBox="0 0 256 256"><path d="M61.66,37.66l-32,32A8,8,0,0,1,18.34,58.34l32-32A8,8,0,0,1,61.66,37.66Zm176,20.68-32-32a8,8,0,0,0-11.32,11.32l32,32a8,8,0,0,0,11.32-11.32ZM224,136a96,96,0,1,1-96-96A96.11,96.11,0,0,1,224,136Zm-32,0a8,8,0,0,0-8-8H136V80a8,8,0,0,0-16,0v56a8,8,0,0,0,8,8h56A8,8,0,0,0,192,136Z"></path></svg>`}
                  imageWidth={20}
                  imageHeight={20}
                  width="20px"
                  height="20px"
                  description="Timer icon"
                />
                <text size="large" weight="bold" color={timeLeft <= 10 ? colors.error : colors.white}>{timeLeft}s</text>
              </hstack>
            </hstack>
          )}
      </hstack>
    );

    const renderLifelines = () => (
      <vstack gap="small" width="100%">
        <text size="small" weight="bold" alignment="center" color={colors.white}>Lifelines</text>
        <hstack gap={gameUI.lifelines.button.gap} width="100%" alignment="middle center">
          <hstack 
            width={`${gameUI.lifelines.button.width}%`}
            height={`${gameUI.lifelines.button.height}px`}
            padding={gameUI.lifelines.button.padding}
            backgroundColor={fiftyFifty ? gameUI.lifelines.fiftyFifty.background : gameUI.lifelines.button.disabledColor}
            cornerRadius={gameUI.lifelines.button.cornerRadius}
            alignment="middle center"
            onPress={() => { if (fiftyFifty) useLifeline('fiftyFifty'); }}
          >
            <hstack gap="small" alignment="middle center">
              <image 
                url={svg`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ffffff" viewBox="0 0 256 256"><path d="M224,152v40a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V152a16,16,0,0,1,16-16H208A16,16,0,0,1,224,152ZM208,48H48A16,16,0,0,0,32,64v40a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V64A16,16,0,0,0,208,48Z"></path></svg>`}
                imageWidth={16}
                imageHeight={16}
                width="16px"
                height="16px"
                resizeMode="contain"
                description="50:50 icon"
              />
              <text size={gameUI.lifelines.button.textSize} weight={gameUI.lifelines.button.textWeight} color={gameUI.lifelines.button.textColor}>50:50</text>
            </hstack>
          </hstack>
          <hstack 
            width={`${gameUI.lifelines.button.width}%`}
            height={`${gameUI.lifelines.button.height}px`}
            backgroundColor={askAudience ? gameUI.lifelines.ask.background : gameUI.lifelines.button.disabledColor}
            cornerRadius={gameUI.lifelines.button.cornerRadius}
            alignment="middle center"
            onPress={() => { if (askAudience) useLifeline('askAudience'); }}
          >
            <hstack gap="small" alignment="middle center">
              <image 
                url={svg`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ffffff" viewBox="0 0 256 256"><path d="M64.12,147.8a4,4,0,0,1-4,4.2H16a8,8,0,0,1-7.8-6.17,8.35,8.35,0,0,1,1.62-6.93A67.79,67.79,0,0,1,37,117.51a40,40,0,1,1,66.46-35.8,3.94,3.94,0,0,1-2.27,4.18A64.08,64.08,0,0,0,64,144C64,145.28,64,146.54,64.12,147.8Zm182-8.91A67.76,67.76,0,0,0,219,117.51a40,40,0,1,0-66.46-35.8,3.94,3.94,0,0,0,2.27,4.18A64.08,64.08,0,0,1,192,144c0,1.28,0,2.54-.12,3.8a4,4,0,0,0,4,4.2H240a8,8,0,0,0,7.8-6.17A8.33,8.33,0,0,0,246.17,138.89Zm-89,43.18a48,48,0,1,0-58.37,0A72.13,72.13,0,0,0,65.07,212,8,8,0,0,0,72,224H184a8,8,0,0,0,6.93-12A72.15,72.15,0,0,0,157.19,182.07Z"></path></svg>`}
                imageWidth={16}
                imageHeight={16}
                width="16px"
                height="16px"
                resizeMode="contain"
                description="Ask audience icon"
              />
              <text size={gameUI.lifelines.button.textSize} weight={gameUI.lifelines.button.textWeight} color={gameUI.lifelines.button.textColor}>Ask</text>
            </hstack>
          </hstack>
          <hstack 
            width={`${gameUI.lifelines.button.width}%`}
            height={`${gameUI.lifelines.button.height}px`}
            backgroundColor={phoneFriend ? gameUI.lifelines.call.background : gameUI.lifelines.button.disabledColor}
            cornerRadius={gameUI.lifelines.button.cornerRadius}
            alignment="middle center"
            onPress={() => { if (phoneFriend) useLifeline('phoneFriend'); }}
          >
            <hstack gap="small" alignment="middle center">
              <image 
                url={svg`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ffffff" viewBox="0 0 256 256"><path d="M231.88,175.08A56.26,56.26,0,0,1,176,224C96.6,224,32,159.4,32,80A56.26,56.26,0,0,1,80.92,24.12a16,16,0,0,1,16.62,9.52l21.12,47.15,0,.12A16,16,0,0,1,117.39,96c-.18.27-.37.52-.57.77L96,121.45c7.49,15.22,23.41,31,38.83,38.51l24.34-20.71a8.12,8.12,0,0,1,.75-.56,16,16,0,0,1,15.17-1.4l.13.06,47.11,21.11A16,16,0,0,1,231.88,175.08Z"></path></svg>`}
                imageWidth={16}
                imageHeight={16}
                width="16px"
                height="16px"
                resizeMode="contain"
                description="Phone call icon"
              />
              <text size={gameUI.lifelines.button.textSize} weight={gameUI.lifelines.button.textWeight} color={gameUI.lifelines.button.textColor}>Call</text>
            </hstack>
          </hstack>
        </hstack>
      </vstack>
    );

    const renderAudienceResults = () => {
      if (audienceResults.length === 0 || gameQuestions.length === 0) return null;
      
      const currentQ = gameQuestions[currentQuestion];
      return (
        <vstack gap={gameUI.lifelineCard.header.gap} width="100%" padding={gameUI.lifelineCard.container.padding} backgroundColor={gameUI.lifelineCard.container.background} cornerRadius={gameUI.lifelineCard.container.cornerRadius}>
          <hstack width="100%">
            <text size={gameUI.lifelineCard.container.textSize} weight={gameUI.lifelineCard.container.textWeight} color={gameUI.lifelineCard.container.textColor} alignment="start" width="70%">Audience Results</text>
            <vstack width="30%" alignment="end">
            <hstack
              padding={gameUI.lifelineCard.hide.padding}
              cornerRadius={gameUI.lifelineCard.container.cornerRadius}
              backgroundColor={gameUI.lifelineCard.hide.background}
              onPress={() => setShowAudienceResults(false)}>
              <text size={gameUI.lifelineCard.hide.textSize} weight={gameUI.lifelineCard.hide.textWeight} color={gameUI.lifelineCard.hide.textColor}>Hide</text>
            </hstack>
            </vstack>
          </hstack>
          <vstack gap="small" width="100%">
            {audienceResults.map((percentage, index) => {
              return (
                <hstack key={index.toString()} width="100%" gap={gameUI.lifelineCard.container.gap} alignment="start">
                  <text size={gameUI.lifelineCard.container.textSize} weight={gameUI.lifelineCard.container.textWeight} color={gameUI.lifelineCard.container.textColor} width="25px">
                    {String.fromCharCode(65 + index)}:
                  </text>
                  <vstack width="100%" gap={gameUI.lifelineCard.container.gap}>
                    <hstack width="100%" gap={gameUI.lifelineCard.container.gap} alignment="start">
                      <vstack 
                        width={`${Math.min(percentage, 60)}%`} 
                        height="15px" 
                        backgroundColor={index === currentQ.correctAnswer ? gameUI.lifelineCard.container.correctAnswer : gameUI.lifelineCard.container.wrongAnswer}
                        cornerRadius="small"
                      />
                      <text size={gameUI.lifelineCard.container.textSize} weight={gameUI.lifelineCard.container.textWeight} color={gameUI.lifelineCard.container.textColor} width="40px">
                        {percentage.toString()}%
                      </text>
                    </hstack>
                  </vstack>
                </hstack>
              );
            })}
          </vstack>
        </vstack>
      );
    };

    const renderHint = () => {
      if (!showHint || !currentFriend) return null;
      
      // Get current question for hint
      const currentQ = gameQuestions[currentQuestion];
      
      return (
        <vstack gap={gameUI.lifelineCard.header.gap} width="100%" padding={gameUI.lifelineCard.container.padding} backgroundColor={gameUI.lifelineCard.container.background} cornerRadius={gameUI.lifelineCard.container.cornerRadius}>
          <hstack width="100%">
            <hstack gap="small" alignment="start" width="70%">
              <image 
                url={svg`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ffffff" viewBox="0 0 256 256"><path d="M144.27,45.93a8,8,0,0,1,9.8-5.66,86.22,86.22,0,0,1,61.66,61.66,8,8,0,0,1-5.66,9.8A8.23,8.23,0,0,1,208,112a8,8,0,0,1-7.73-5.93,70.35,70.35,0,0,0-50.33-50.34A8,8,0,0,1,144.27,45.93Zm-2.33,41.8c13.79,3.68,22.65,12.55,26.33,26.34A8,8,0,0,0,176,120a8.23,8.23,0,0,0,2.07-.27,8,8,0,0,0,5.66-9.8c-5.12-19.16-18.5-32.54-37.66-37.66a8,8,0,1,0-4.13,15.46Zm72.43,78.73-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L126.87,168c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L89.54,41.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,24,88c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,214.37,166.46Z"></path></svg>`}
                imageWidth={16}
                imageHeight={16}
                width="16px"
                height="16px"
                resizeMode="contain"
                description="Phone call icon"
              />
              <text size={gameUI.lifelineCard.container.textSize} weight={gameUI.lifelineCard.container.textWeight} color={gameUI.lifelineCard.container.textColor} alignment="start">Calling {currentFriend.name}</text>
            </hstack>
            <vstack width="30%" alignment="end">
            <hstack
              padding={gameUI.lifelineCard.hide.padding}
              cornerRadius={gameUI.lifelineCard.container.cornerRadius}
              backgroundColor={gameUI.lifelineCard.hide.background}
              onPress={() => setShowHint(false)}>
              <text size={gameUI.lifelineCard.hide.textSize} weight={gameUI.lifelineCard.hide.textWeight} color={gameUI.lifelineCard.hide.textColor}>Hide</text>
            </hstack>
            </vstack>
          </hstack>
          <vstack gap="medium" width="100%">
            <text size={gameUI.lifelineCard.container.textSize} color={gameUI.lifelineCard.container.textColor} wrap={true}>
              {currentFriend.catchphrase}
            </text>
            {currentQ && currentQ.hint && (
                <text size={gameUI.lifelineCard.container.textSize} weight={gameUI.lifelineCard.container.textWeight} color={gameUI.lifelineCard.container.textColor} wrap={true}>
                Hint: {currentQ.hint}
              </text>
            )}
          </vstack>
        </vstack>
      );
    };

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
            backgroundColor={card.container.background}
            cornerRadius={card.container.cornerRadius}>
            <vstack padding={card.container.padding} gap={card.container.gap} alignment={card.container.alignment}>
              <hstack
                backgroundColor={card.highlight.background}
                cornerRadius={card.highlight.cornerRadius}
                padding={card.highlight.padding}>
                <text size={card.highlight.textSize} color={card.highlight.textColor} weight={gameUI.question.textWeight}>Question {currentQuestion + 1}</text>
              </hstack>
              <text size={card.container.textSize} weight={card.container.textWeight} color={card.container.textColor} wrap={true}>
                {currentQ.question}</text>
            </vstack>
          </vstack>
          
          {/* Show either audience results, hint, or answer options */}
          {showAudienceResults ? renderAudienceResults() : showHint ? renderHint() : (
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

    const renderWon = () => (
      <vstack gap="large" width="100%" height="100%" alignment="center" padding="large">
        <vstack gap="small" alignment="center">
          <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>
            CONGRATULATIONS!
          </text>
          <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>
            You won
          </text>
          <text size={page.subheading.textSize} weight={page.subheading.textWeight} color={page.subheading.textColor} alignment={page.subheading.alignment}>
            R$1,000,000!
          </text>
        </vstack>

        <vstack gap="small">
          <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>
            You successfully answered all the correct questions!
          </text>
        </vstack>

        <vstack gap="medium" width="100%" maxWidth="400px">
          <hstack 
            width={`${page.button.width}%`}
            height={`${page.button.height}px`}
            backgroundColor={page.button.background}
            cornerRadius={page.button.cornerRadius}
            onPress={async () => {
              try {
                const subreddit = await context.reddit.getCurrentSubreddit();
                console.log('Updating leaderboard with score:', score);
                await LeaderboardService.updateLeaderboard(context, subreddit.name, score);
              } catch (error) {
                console.error('Error updating leaderboard:', error);
              }
              resetGame();
            }}
            alignment={page.button.alignment}
          >
            <text size={page.button.textSize} weight={page.button.textWeight} color={page.button.textColor}>Play Again</text>
          </hstack>
        </vstack>
      </vstack>
    );

    const renderLost = () => (
      <vstack gap="large" width="100%" height="100%" alignment="center" padding="large">
        <vstack gap="small" alignment="center">
          <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>
            Game Over!
          </text>
          <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>
            You lost at
          </text>
          <text size={page.subheading.textSize} weight={page.subheading.textWeight} color={page.subheading.textColor} alignment={page.subheading.alignment}>
            Question {currentQuestion + 1}
          </text>
          {timedOut && (
            <text size={page.subheading.textSize} weight={page.subheading.textWeight} color={page.subheading.textColor} alignment={page.subheading.alignment}>
              Times up!
            </text>
          )}
        </vstack>

        {lastAnswerExplanation && (
          <vstack
            width="100%"
            backgroundColor={card.container.background}
            cornerRadius={card.container.cornerRadius}>
            <vstack padding={card.container.padding} gap={card.container.gap} alignment={card.container.alignment}>
              <hstack
                backgroundColor={card.highlight.background}
                cornerRadius={card.highlight.cornerRadius}
                padding={card.highlight.padding}
              >
                <text size={card.highlight.textSize} color={card.highlight.textColor}>Answer</text>
              </hstack>
              <text size={card.container.textSize} color={card.container.textColor} wrap={true}>{lastAnswerExplanation}</text>
            </vstack>
          </vstack>
        )}

        <vstack gap="medium" width="100%" maxWidth="400px">
          <hstack 
            width={`${page.button.width}%`}
            height={`${page.button.height}px`}
            backgroundColor={page.button.background}
            cornerRadius={page.button.cornerRadius}
            onPress={async () => {
              try {
                const subreddit = await context.reddit.getCurrentSubreddit();
                console.log('Updating leaderboard with score:', score);
                await LeaderboardService.updateLeaderboard(context, subreddit.name, score);
              } catch (error) {
                console.error('Error updating leaderboard:', error);
              }
              resetGame();
            }}
            alignment={page.button.alignment}
          >
            <text size={page.button.textSize} weight={page.button.textWeight} color={page.button.textColor}>Play Again</text>
          </hstack>
        </vstack>
      </vstack>
    );

    const renderWalked = () => (
      <vstack gap="large" width="100%" height="100%" alignment="center" padding="large">
        <vstack gap="small" alignment="center">
          <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>
            You Walked Away!
          </text>
          <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>
            You walked away with R${score}!
          </text>
        </vstack>

        <vstack gap="medium" width="100%" maxWidth="400px">
          <hstack 
            width={`${page.button.width}%`}
            height={`${page.button.height}px`}
            backgroundColor={page.button.background}
            cornerRadius={page.button.cornerRadius}
            onPress={async () => {
              try {
                const subreddit = await context.reddit.getCurrentSubreddit();
                console.log('Updating leaderboard with score:', score);
                await LeaderboardService.updateLeaderboard(context, subreddit.name, score);
              } catch (error) {
                console.error('Error updating leaderboard:', error);
              }
              resetGame();
            }}
            alignment={page.button.alignment}
          >
            <text size={page.button.textSize} weight={page.button.textWeight} color={page.button.textColor}>Play Again</text>
          </hstack>
        </vstack>
      </vstack>
    );

    const renderWalkAwayPrompt = () => (
      <vstack gap="large" width="100%" height="100%" alignment="center" padding="large">
        <vstack gap="medium" alignment="center">
          <text size="xxlarge" weight="bold" color={colors.white}>
            Milestone Reached!
          </text>
          <text size="large" color={colors.white} alignment="center">
            You've secured R${moneyLadder[currentQuestion].amount}!
          </text>
          <text size="medium" color={colors.white} alignment="center">
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
            <text size={page.button.textSize} weight={page.button.textWeight} color={page.button.textColor}>Continue Playing</text>
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
            alignment={page.button.alignment}
          >
            <text size={page.button.textSize} weight={page.button.textWeight} color={page.button.textColor}>Walk Away</text>
          </hstack>
        </vstack>
      </vstack>
    );

    const renderGameOver = () => {
      if (gameStatus === 'won') return renderWon();
      if (gameStatus === 'lost') return renderLost();
      if (gameStatus === 'walked') return renderWalked();
      return null;
    };

    // Pages Walk Away, Leaderboard, How to Play

    const renderLeaderboard = () => (
      <vstack gap={page.base.gap} width="100%" height="100%" alignment={page.base.alignment} padding={page.base.padding}>
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
        <vstack gap="none" width="100%" padding="none" backgroundColor={table.background} cornerRadius={table.cornerRadius}>
          {leaderboardData.length > 0 ? (
            <vstack width="100%" gap="none">
              <hstack width="100%" padding="small">
                <text size="small" width="10%" color={table.color} weight={table.header.textWeight}>#</text>
                <text size="small" width="60%" color={table.color} weight={table.header.textWeight}>Username</text>
                <hstack width="30%" alignment="end">
                  <text size="small" color={table.color} weight={table.header.textWeight}>Bank</text>
                </hstack>
              </hstack>
              {leaderboardData.map((entry, index) => (
                <hstack 
                  key={entry.userId} 
                  width="100%" 
                  padding="small"
                  backgroundColor={index % 2 === 0 ? table.evenItem.background : table.oddItem.background}
                >
                  <text size={table.textSize} width="10%" color={table.color}>{index + 1}.</text>
                  <hstack width="60%" gap="small" alignment="start middle">
                  <text size={table.textSize} color={table.color}>u/{entry.userId}</text>
                    {index === 0 && (
                      <image url="leaderboard-icon.png" imageWidth={16} imageHeight={16} width="16px" height="16px" resizeMode="contain" description="Leaderboard icon" />
                    )}
                  </hstack>
                  <hstack width="30%" alignment="end">
                    <text size={table.textSize} weight={table.header.textWeight} color={table.gold}>R${entry.score}</text>
                  </hstack>
                </hstack>
              ))}
            </vstack>
          ) : (
            <vstack gap="large" width="100%" padding="medium" alignment="center">
              <vstack gap="small">
                <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>No scores yet!</text>
                <vstack gap="none" alignment={page.heading.alignment}>
                  <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>
                    Leaderboard will be updated as
                  </text>
                  <text size={page.subheading.textSize} weight={page.subheading.textWeight} color={page.subheading.textColor} alignment={page.subheading.alignment}>
                    games are played
                  </text>
                </vstack>
              </vstack>
              <vstack gap="medium" width="100%" maxWidth="400px">
              <hstack
                width={`${page.button.width}%`}
                height={`${page.button.height}px`}
                backgroundColor={page.button.background}
                cornerRadius={page.button.cornerRadius}
                onPress={startGame}
                alignment={page.button.alignment}
              >
                <text size={page.button.textSize} weight={page.button.textWeight} color={page.button.textColor}>Start Game</text>
              </hstack>
              </vstack>
            </vstack>
          )}
        </vstack>
      </vstack>
    );

    const renderHowToPlay = () => (
      <vstack gap={page.base.gap} width="100%" height="100%" alignment={page.base.alignment} padding={page.base.padding}>
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
        <vstack
            width="100%"
            backgroundColor={card.container.background}
            cornerRadius={card.container.cornerRadius}>
            <vstack padding={card.container.padding} gap={card.container.gap} alignment={card.container.alignment}>
              <hstack
                backgroundColor={card.highlight.background}
                cornerRadius={card.highlight.cornerRadius}
                padding={card.highlight.padding}
              >
                <text size={card.highlight.textSize} color={card.highlight.textColor}>Objective</text>
              </hstack>
              <text size={card.container.textSize} color={card.container.textColor} wrap={true}>• Answer 12 questions correctly to win the grand prize of R$1,000,000!</text>
            </vstack>
          </vstack>
          <vstack
            width="100%"
            backgroundColor={card.container.background}
            cornerRadius={card.container.cornerRadius}>
            <vstack padding={card.container.padding} gap={card.container.gap} alignment={card.container.alignment}>
              <hstack
                backgroundColor={card.highlight.background}
                cornerRadius={card.highlight.cornerRadius}
                padding={card.highlight.padding}
              >
                <text size={card.highlight.textSize} color={card.highlight.textColor}>Money Ladder</text>
                </hstack>
              <text size={card.container.textSize} color={card.container.textColor} wrap={true}>• Each correct answer moves you up the money ladder</text>
              <text size={card.container.textSize} color={card.container.textColor} wrap={true}>• Milestone questions (★) let you walk away with guaranteed money</text>
            </vstack>
          </vstack>
          <vstack
            width="100%"
            backgroundColor={card.container.background}
            cornerRadius={card.container.cornerRadius}>
            <vstack padding={card.container.padding} gap={card.container.gap} alignment={card.container.alignment}>
              <hstack
                backgroundColor={card.highlight.background}
                cornerRadius={card.highlight.cornerRadius}
                padding={card.highlight.padding}
              >
                <text size={card.highlight.textSize} color={card.highlight.textColor}>Lifelines</text>
              </hstack>
              <text size={card.container.textSize} color={card.container.textColor} wrap={true}>• 50:50 - Eliminates two wrong answers</text>
            <text size={card.container.textSize} color={card.container.textColor} wrap={true}>• Ask Audience - Shows audience poll results</text>
            <text size={card.container.textSize} color={card.container.textColor} wrap={true}>• Phone a Friend - Get a hint from a friend</text>
            </vstack>
          </vstack>
        </vstack>
      </vstack>
    );

    return (
      <zstack width="100%" height="100%">
      <image url={bgUrl} imageWidth={1920} imageHeight={1080} width="100%" height="100%" resizeMode="cover" description="background" />
        <vstack height="100%" width="100%" padding={page.base.padding}>
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
                <text size={buttons.base.textSize} weight={buttons.base.textWeight} color={buttons.base.textColor}>Start Game</text>
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
              <text size={buttons.base.textSize} weight={buttons.base.textWeight} color={buttons.base.textColor}>Leaderboard</text>
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
            <text size={buttons.base.textSize} weight={buttons.base.textWeight} color={buttons.base.textColor}>How to Play</text>
          </hstack>
        </vstack>
      </vstack>
    )}

        {showLeaderboard && renderLeaderboard()}
        {showHowToPlay && renderHowToPlay()}

        {gameStatus === 'playing' && gameQuestions.length > 0 && !showWalkAway && (
          <vstack width="100%" height="100%" padding="medium" gap="medium">
            {/* Gameplay Header */}
            <hstack width="100%" alignment="start middle" padding="none">
              <hstack width="80%" alignment="start middle" padding="none">
                <image url="logo.png" width="125px" height={`${page.header.title.height}px`} resizeMode="contain" description="Reddionaire logo" />
              </hstack>
              <hstack width="20%" alignment="end middle" padding="none">
                <hstack 
                  onPress={resetGame} 
                  alignment="middle center"
                >
                  <image 
                    url={svg`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ffffff" viewBox="0 0 256 256"><path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z"></path></svg>`}
                    imageWidth={24}
                    imageHeight={24}
                    width="24px"
                    height="24px"
                    resizeMode="contain"
                    description="Home icon"
                  />
                </hstack>
              </hstack>
            </hstack>
            
            {renderMoneyLadder()}
            <vstack width="100%" gap="medium" alignment="center">
              {renderQuestion()}
              {renderLifelines()}
            </vstack>
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
