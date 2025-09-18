// Learn more at developers.reddit.com/docs
import { Devvit, useState, useInterval, TriggerContext, svg } from "@devvit/public-api";
import questionsData from "./questions.json" with { type: "json" };
import { LeaderboardService } from "./server.js";
import { logo, colors, buttons, card, table, gameUI, page } from "./theme.js";

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
    // Create a proper array copy to avoid any property issues
    const shuffled = Array.from(array);
    let currentSeed = seed;
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Generate random index using linear congruential generator
      currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
      const j = Math.floor((currentSeed / 4294967296) * (i + 1));
      
      // Ensure j is within bounds and swap elements
      if (j >= 0 && j <= i) {
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }
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
  const finalQuestions = selectedQuestions.slice(0, questionsPerGame).filter(question => question && question.options && question.options.length === 4).map((question, questionIndex) => {
    // Create a copy of the question
    const shuffledQuestion = { ...question };
    
    // Create array of indices [0, 1, 2, 3]
    const indices = [0, 1, 2, 3];
    
    // Use Fisher-Yates shuffle for option randomization too
    const shuffledIndices = shuffleArray(indices, hash + questionIndex * 10000);
    
    // Create new options array with shuffled order - ensure all 4 options are preserved
    const newOptions = shuffledIndices.map(index => {
      const option = question.options[index];
      if (option === undefined) {
        console.warn(`Missing option at index ${index} for question ${question.id}`, {
          originalOptions: question.options,
          shuffledIndices,
          questionId: question.id
        });
        return `Option ${String.fromCharCode(65 + index)}`; // Fallback
      }
      return option;
    });
    
    // Debug logging
    if (newOptions.length !== 4) {
      console.error(`Question ${question.id} has ${newOptions.length} options after shuffling:`, {
        originalOptions: question.options,
        shuffledIndices,
        newOptions
      });
    }
    
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
            {/* <image url="logo.png" imageWidth={225} imageHeight={53} width="225px" height="53px" resizeMode="contain" description="Reddionaire logo" /> */}
            <vstack alignment="center" gap="small">
              <text size="large" weight="bold" color={colors.accent}>
                Test your knowledge with 12  
              </text>
              <text size="large" weight="bold" color={colors.accent}>
                questions and win up to
              </text>
              <text size="xlarge" weight="bold" color={colors.accent}>
                R$1,000,000
              </text>
            </vstack>
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
        setTimeLeft(310);
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
      
      // Generate raw percentages for all 4 options
      const rawPercentages = [0, 1, 2, 3].map((_, index) => {
        if (index === correctAnswer) {
          // Correct answer gets higher percentage based on difficulty
          let basePercentage;
          if (difficulty === 'easy') {
            basePercentage = 50 + Math.floor(seededRandom() * 30); // 50-80%
          } else if (difficulty === 'medium') {
            basePercentage = 35 + Math.floor(seededRandom() * 35); // 35-70%
          } else {
            basePercentage = 20 + Math.floor(seededRandom() * 40); // 20-60%
          }
          return basePercentage;
        } else {
          // Wrong answers get lower, random percentages
          return Math.floor(seededRandom() * 25) + 5; // 5-30%
        }
      });
      
      // Normalize to exactly 100%
      const total = rawPercentages.reduce((sum, val) => sum + val, 0);
      const normalizedPercentages = rawPercentages.map(p => Math.round((p / total) * 100));
      
      // Ensure the total is exactly 100 by adjusting the correct answer
      const finalTotal = normalizedPercentages.reduce((sum, val) => sum + val, 0);
      const diff = 100 - finalTotal;
      normalizedPercentages[correctAnswer] += diff;
      
      return normalizedPercentages;
    };

    const useLifeline = (lifeline: string) => {
      // Close any currently open lifeline displays
      setShowAudienceResults(false);
      setShowHint(false);
      
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
        <hstack gap="small" alignment="start" width="70%">
          <hstack 
            backgroundColor={gameUI.moneyLadder.container.background}
            cornerRadius={gameUI.moneyLadder.container.cornerRadius}
            padding={gameUI.moneyLadder.container.padding}>
            <hstack gap="small" alignment="middle center">
            <zstack>
            <image 
                url={svg`<svg id="fi_9382138" enable-background="new 0 0 512 512" height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg"><g id="Currency"><g id="BrazilReal"><g id="Coin"><g id="Bottom"><ellipse cx="256" cy="256" fill="#e88102" rx="245" ry="256"></ellipse><circle cx="256" cy="242.5" fill="#fdd835" r="242.5"></circle></g><g id="Shade" fill="#fff"><path d="m352.8 20.1-319.2 319.1c-10.7-24.5-17.4-51.1-19.4-79l259.5-259.6c27.9 2.1 54.5 8.8 79.1 19.5z" opacity=".5"></path><path d="m467.3 123.5-330.3 330.3c-20.6-11.6-39.2-26.1-55.5-43l342.9-342.8c16.8 16.2 31.3 34.9 42.9 55.5z" opacity=".5"></path><path d="m414.5 58.9-342 342c-5.3-6.2-10.4-12.7-15.1-19.4l337.7-337.7c6.7 4.7 13.2 9.8 19.4 15.1z" opacity=".5"></path><path d="m490.9 182-295.4 295.4c-8.9-2.3-17.6-5.1-26.1-8.3l313.2-313.2c3.2 8.5 6 17.2 8.3 26.1z" opacity=".5"></path><path d="m498.5 242.5c0 1.7 0 3.3-.1 5-2.6-131.6-110.1-237.5-242.4-237.5s-239.8 105.9-242.4 237.5c0-1.7-.1-3.3-.1-5 0-133.9 108.6-242.5 242.5-242.5s242.5 108.6 242.5 242.5z" opacity=".5"></path><path d="m453 253c0 104.9-85.1 190-190 190-58.9 0-111.6-26.9-146.5-69 34.7 37.5 84.3 61 139.5 61 104.9 0 190-85.1 190-190 0-46-16.3-88.1-43.5-121 31.3 33.9 50.5 79.2 50.5 129z" opacity=".5"></path></g><g id="Top"><circle cx="256" cy="245" fill="#f39e09" r="190"></circle><path d="m400 121c-33.3-28.7-76.6-46-124-46-104.9 0-190 85.1-190 190 0 47.4 17.3 90.7 46 124-40.4-34.9-66-86.4-66-144 0-104.9 85.1-190 190-190 57.5 0 109.1 25.6 144 66z" fill="#e88102"></path></g></g><g id="Icon"><g id="Bottom-2" fill="#db6704"><path d="m221.8 275.1c10.1-4.8 17.6-11 22.3-18.7 4.8-7.7 7.1-17.4 7.1-29.2v-15s-9.1-16.4-16.9-22.6c-11.3-8.9-26.9-13.3-46.9-13.3h-66.4v168.7h40.7v-59.6h22l29.8 59.6h43.5v-15zm-17-27.2c-3.9 4.1-9.7 6.1-17.4 6.1h-25.7v-46.4h25.7c7.6 0 13.4 2.1 17.4 6.2 3.9 4.1 5.9 9.9 5.9 17.1s-2 13-5.9 17z"></path><path d="m334 203.4c5.7 0 10.1 2.2 13.2 6.5s4.6 10.5 4.6 18.5h39.2v-15s-7.1-15.4-12.1-21.3c-8.1-9.5-19.2-15.4-33.3-17.4v-24.9h-18.4v24.4c-14.7 1.4-26.4 6.3-35.2 14.8-6.1 5.8-13.2 17.3-13.2 17.3v15c0 7.8 1.2 14.4 3.7 19.9s6 10.3 10.7 14.5c4.6 4.2 10.1 7.8 16.6 11 6.4 3.2 13.4 6.3 21 9.4s12.9 6.4 15.9 9.9 4.5 8.3 4.5 14.4c0 5.5-1.5 9.8-4.5 12.9s-7.1 4.7-12.4 4.7c-7.2 0-12.7-2.3-16.6-6.9s-5.9-11.3-5.9-20.1l-39-15v15c0 16 4.5 28.9 13.5 38.6 9 9.8 21.9 15.5 38.8 17.3v23.4h18.4v-23.3c14.4-1.4 25.9-6.2 34.2-14.6s12.6-19.1 12.6-32.3v-15s-2.9-2.8-3.9-5c-2.6-5.6-6.2-10.4-10.9-14.6-4.6-4.2-10.1-7.9-16.5-11.2s-13.1-6.4-20.3-9.5-12.4-6.2-15.6-9.6-4.9-7.9-4.9-13.6 1.4-10.1 4.2-13.3 6.5-4.9 11.6-4.9z"></path></g><g id="Top-2" fill="#fdd835"><path d="m183.7 270.3h-22v59.7h-40.7v-168.7h66.4c20 0 35.6 4.4 46.9 13.3s16.9 21.4 16.9 37.6c0 11.7-2.4 21.4-7.1 29.2s-12.2 14-22.3 18.7l35.2 68.1v1.7h-43.6zm-22-31.3h25.7c7.7 0 13.5-2 17.4-6.1s5.9-9.7 5.9-17-2-13-5.9-17.1-9.7-6.2-17.4-6.2h-25.7z"></path><path d="m351 285.2c0-6.1-1.5-10.9-4.5-14.4s-8.3-6.8-15.9-9.9-14.6-6.2-21-9.4-11.9-6.8-16.6-11-8.2-9-10.7-14.5-3.7-12.1-3.7-19.9c0-13.1 4.4-23.8 13.2-32.3s20.5-13.4 35.2-14.8v-24.4h18.4v24.9c14.1 2.1 25.2 7.9 33.3 17.4s12.1 21.6 12.1 36.3h-39.1c0-8-1.5-14.2-4.6-18.5s-7.5-6.5-13.2-6.5c-5.1 0-9 1.6-11.9 4.8-2.8 3.2-4.2 7.6-4.2 13.3s1.6 10.2 4.9 13.6 8.5 6.6 15.6 9.6c7.2 3.1 14 6.2 20.3 9.5s11.9 7 16.5 11.2 8.3 9 10.9 14.6 3.9 12.2 3.9 20c0 13.2-4.2 24-12.6 32.3s-19.8 13.2-34.2 14.6v23.3h-18.4v-23.4c-16.8-1.8-29.8-7.5-38.8-17.3s-13.5-22.6-13.5-38.6h39c0 8.8 2 15.5 5.9 20.1s9.4 6.9 16.6 6.9c5.2 0 9.4-1.6 12.4-4.7s4.7-7.3 4.7-12.8z"></path></g><g id="Shade-2" fill="#fff"><path d="m209.4 163.5-29.1 29.1h-18.6v18.6l-40.7 40.6v-90.5h66.4c8 0 15.3.7 22 2.2z" opacity=".5"></path><path d="m225.3 267 31.7 61.2v1.8h-43.6l-17-34.1z" opacity=".5"></path><path d="m311.7 275.9c0 1.1 0 2.2.1 3.2l-30 30c-6.1-9-9.2-20-9.2-33.2z" opacity=".5"></path><path d="m322.1 193.2c-2.8 3.2-4.2 7.6-4.2 13.3s1.6 10.2 4.9 13.6c3.2 3.4 8.5 6.6 15.6 9.6 5.4 2.3 10.6 4.7 15.6 7.1l-24 24c-7.3-3-14.1-6-20.3-9.1-6.4-3.2-11.9-6.8-16.6-11-4.6-4.2-8.2-9-10.6-14.5-1.7-3.8-2.8-8.1-3.4-12.9l66.5-66.5v12.9c14.1 2.1 25.2 7.9 33.3 17.4 5.6 6.7 9.3 14.6 11 23.8l-12.5 12.5h-25.5c0-8-1.5-14.2-4.6-18.5s-7.5-6.5-13.2-6.5c-5.2 0-9.1 1.6-12 4.8z" opacity=".5"></path><path d="m121 317.9 40.7-40.6v34.4l-18.3 18.3h-22.4z" opacity=".5"></path><path d="m251.2 212.2c0 3.8-.2 7.4-.7 10.7l-60.3 60.3-6.5-13h-15l78.7-78.7c2.5 6.1 3.8 13 3.8 20.7z" opacity=".5"></path><path d="m292 174c5.2-5 11.5-8.8 18.7-11.3l-30.2 30.2c2.1-7.2 5.9-13.5 11.5-18.9z" opacity=".5"></path><path d="m338.6 134.8-11.4 11.4v-11.4z" opacity=".5"></path><path d="m324.9 348v-16.2c-5.5-.6-10.6-1.6-15.2-3l26-26c4.6-.3 8.2-1.8 10.9-4.6 2.6-2.7 4.1-6.3 4.4-10.7l30.4-30.4c1.9 2.5 3.4 5.1 4.8 7.9 2.4 5 3.7 11 3.9 17.9z" opacity=".5"></path><path d="m414.5 140.1c-123 43.2-221.8 138.1-270.2 258.6-4.2-3.1-8.3-6.3-12.3-9.8-28.7-33.3-46-76.6-46-123.9 0-104.9 85.1-190 190-190 47.4 0 90.7 17.3 123.9 46 5.3 6.1 10.1 12.5 14.6 19.1z" opacity=".25"></path></g></g></g></g></svg>`}
                imageWidth={gameUI.moneyLadder.icon.width} 
                imageHeight={gameUI.moneyLadder.icon.height} 
                width={`${gameUI.moneyLadder.icon.width}px`} 
                height={`${gameUI.moneyLadder.icon.height}px`} 
                description="Reddionaire icon"
              />
            </zstack>
              <text size={gameUI.moneyLadder.container.textSize} weight={gameUI.moneyLadder.container.textWeight} color={gameUI.moneyLadder.container.textColor}>R${moneyLadder[currentQuestion].amount}</text>
            </hstack>
          </hstack>
          
          {moneyLadder[currentQuestion].milestone && (
            <vstack alignment="middle center" padding="small">
              <hstack gap="small" alignment="middle center">
                <image 
                  url={svg`<svg id="Layer_1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><path d="m511.43 133.89-59.81 204.91-17.7 60.58h-355.84l-17.7-60.58-59.81-204.91a13.65 13.65 0 0 1 18.65-16.3l130.38 57.9 95.16-137.75a13.66 13.66 0 0 1 22.48 0l95.16 137.75 130.38-57.9a13.66 13.66 0 0 1 18.65 16.3z" fill="#ffb703"/><path d="m451.62 338.81-17.7 60.58h-355.84l-17.7-60.58z" fill="#f99300"/><path d="m511.43 133.89-59.81 204.91-17.7 60.58h-255.52c122.89-54.68 180-137 184-223.89l130.38-57.9a13.66 13.66 0 0 1 18.65 16.3z" fill="#f99300"/><path d="m488.83 419.58a60.59 60.59 0 0 1 -60.57 60.58h-344.52a60.58 60.58 0 0 1 0-121.16h344.52a63.11 63.11 0 0 1 8.3.56 60.58 60.58 0 0 1 52.27 60z" fill="#f99300"/><path d="m487.63 407.57a60.57 60.57 0 0 1 -59.37 48.56h-344.52a60.59 60.59 0 0 1 -59.37-48.56 60.59 60.59 0 0 1 59.37-48.57h344.52a60.57 60.57 0 0 1 59.37 48.57z" fill="#ffb703"/><path d="m488.83 419.58a60.59 60.59 0 0 1 -60.57 60.58h-344.52a60.55 60.55 0 0 1 -51.7-29c9.35.19 19.18.44 29.55.79 406.95 13.6 366.67-92.95 366.67-92.95l8.3.56a60.58 60.58 0 0 1 52.27 60z" fill="#f99300"/><g fill="none" stroke="#ffcc29" stroke-linecap="round" stroke-miterlimit="10" stroke-width="16.84"><path d="m251.75 70.27-73.35 103.59"/><path d="m24.37 139.01 99.66 44.3"/><path d="m239.53 375.5h49.54"/><path d="m76.15 375.5h121.55"/></g></svg>`}
                  imageWidth={gameUI.moneyLadder.milestone.icon.width} 
                  imageHeight={gameUI.moneyLadder.milestone.icon.width} 
                  width={`${gameUI.moneyLadder.milestone.icon.width}px`} 
                  height={`${gameUI.moneyLadder.milestone.icon.height}px`} 
                  description="Milestone icon" />
                <text size={gameUI.moneyLadder.milestone.textSize} color={gameUI.moneyLadder.milestone.textColor}>Milestone</text>
              </hstack>
            </vstack>
          )}
        </hstack>
        
          {gameStatus === 'playing' && (
            <hstack width="30%">
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
            <hstack gap="small" alignment="start" width="70%">
              <image 
                url={svg`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ffffff" viewBox="0 0 256 256"><path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1,0-16h8V136a8,8,0,0,1,8-8H72a8,8,0,0,1,8,8v64H96V88a8,8,0,0,1,8-8h32a8,8,0,0,1,8,8V200h16V40a8,8,0,0,1,8-8h40a8,8,0,0,1,8,8V200h8A8,8,0,0,1,232,208Z"></path></svg>`}
                imageWidth={16}
                imageHeight={16}
                width="16px"
                height="16px"
                resizeMode="contain"
                description="Chart bar icon"
              />
              <text size={gameUI.lifelineCard.container.textSize} weight={gameUI.lifelineCard.container.textWeight} color={gameUI.lifelineCard.container.textColor} alignment="start">Audience Results</text>
            </hstack>
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
              // Find the highest percentage to make it green
              const maxPercentage = Math.max(...audienceResults);
              const isHighest = percentage === maxPercentage;
              
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
                        backgroundColor={isHighest ? gameUI.lifelineCard.container.correctAnswer : gameUI.lifelineCard.container.wrongAnswer}
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
          {timedOut ? (
            <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>
              Times up!
            </text>
          ) : (
            <text size={page.heading.textSize} weight={page.heading.textWeight} color={page.heading.textColor} alignment={page.heading.alignment}>
              Game Over!
            </text>
          )}
          <text size={page.paragraph.textSize} color={page.paragraph.textColor} alignment={page.paragraph.alignment}>
            You lost at Question {currentQuestion + 1}
          </text>
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
          <hstack width="80%" alignment="start middle" gap="small">
            <zstack>
            <image 
                url={svg`<svg id="fi_9382138" enable-background="new 0 0 512 512" height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg"><g id="Currency"><g id="BrazilReal"><g id="Coin"><g id="Bottom"><ellipse cx="256" cy="256" fill="#e88102" rx="245" ry="256"></ellipse><circle cx="256" cy="242.5" fill="#fdd835" r="242.5"></circle></g><g id="Shade" fill="#fff"><path d="m352.8 20.1-319.2 319.1c-10.7-24.5-17.4-51.1-19.4-79l259.5-259.6c27.9 2.1 54.5 8.8 79.1 19.5z" opacity=".5"></path><path d="m467.3 123.5-330.3 330.3c-20.6-11.6-39.2-26.1-55.5-43l342.9-342.8c16.8 16.2 31.3 34.9 42.9 55.5z" opacity=".5"></path><path d="m414.5 58.9-342 342c-5.3-6.2-10.4-12.7-15.1-19.4l337.7-337.7c6.7 4.7 13.2 9.8 19.4 15.1z" opacity=".5"></path><path d="m490.9 182-295.4 295.4c-8.9-2.3-17.6-5.1-26.1-8.3l313.2-313.2c3.2 8.5 6 17.2 8.3 26.1z" opacity=".5"></path><path d="m498.5 242.5c0 1.7 0 3.3-.1 5-2.6-131.6-110.1-237.5-242.4-237.5s-239.8 105.9-242.4 237.5c0-1.7-.1-3.3-.1-5 0-133.9 108.6-242.5 242.5-242.5s242.5 108.6 242.5 242.5z" opacity=".5"></path><path d="m453 253c0 104.9-85.1 190-190 190-58.9 0-111.6-26.9-146.5-69 34.7 37.5 84.3 61 139.5 61 104.9 0 190-85.1 190-190 0-46-16.3-88.1-43.5-121 31.3 33.9 50.5 79.2 50.5 129z" opacity=".5"></path></g><g id="Top"><circle cx="256" cy="245" fill="#f39e09" r="190"></circle><path d="m400 121c-33.3-28.7-76.6-46-124-46-104.9 0-190 85.1-190 190 0 47.4 17.3 90.7 46 124-40.4-34.9-66-86.4-66-144 0-104.9 85.1-190 190-190 57.5 0 109.1 25.6 144 66z" fill="#e88102"></path></g></g><g id="Icon"><g id="Bottom-2" fill="#db6704"><path d="m221.8 275.1c10.1-4.8 17.6-11 22.3-18.7 4.8-7.7 7.1-17.4 7.1-29.2v-15s-9.1-16.4-16.9-22.6c-11.3-8.9-26.9-13.3-46.9-13.3h-66.4v168.7h40.7v-59.6h22l29.8 59.6h43.5v-15zm-17-27.2c-3.9 4.1-9.7 6.1-17.4 6.1h-25.7v-46.4h25.7c7.6 0 13.4 2.1 17.4 6.2 3.9 4.1 5.9 9.9 5.9 17.1s-2 13-5.9 17z"></path><path d="m334 203.4c5.7 0 10.1 2.2 13.2 6.5s4.6 10.5 4.6 18.5h39.2v-15s-7.1-15.4-12.1-21.3c-8.1-9.5-19.2-15.4-33.3-17.4v-24.9h-18.4v24.4c-14.7 1.4-26.4 6.3-35.2 14.8-6.1 5.8-13.2 17.3-13.2 17.3v15c0 7.8 1.2 14.4 3.7 19.9s6 10.3 10.7 14.5c4.6 4.2 10.1 7.8 16.6 11 6.4 3.2 13.4 6.3 21 9.4s12.9 6.4 15.9 9.9 4.5 8.3 4.5 14.4c0 5.5-1.5 9.8-4.5 12.9s-7.1 4.7-12.4 4.7c-7.2 0-12.7-2.3-16.6-6.9s-5.9-11.3-5.9-20.1l-39-15v15c0 16 4.5 28.9 13.5 38.6 9 9.8 21.9 15.5 38.8 17.3v23.4h18.4v-23.3c14.4-1.4 25.9-6.2 34.2-14.6s12.6-19.1 12.6-32.3v-15s-2.9-2.8-3.9-5c-2.6-5.6-6.2-10.4-10.9-14.6-4.6-4.2-10.1-7.9-16.5-11.2s-13.1-6.4-20.3-9.5-12.4-6.2-15.6-9.6-4.9-7.9-4.9-13.6 1.4-10.1 4.2-13.3 6.5-4.9 11.6-4.9z"></path></g><g id="Top-2" fill="#fdd835"><path d="m183.7 270.3h-22v59.7h-40.7v-168.7h66.4c20 0 35.6 4.4 46.9 13.3s16.9 21.4 16.9 37.6c0 11.7-2.4 21.4-7.1 29.2s-12.2 14-22.3 18.7l35.2 68.1v1.7h-43.6zm-22-31.3h25.7c7.7 0 13.5-2 17.4-6.1s5.9-9.7 5.9-17-2-13-5.9-17.1-9.7-6.2-17.4-6.2h-25.7z"></path><path d="m351 285.2c0-6.1-1.5-10.9-4.5-14.4s-8.3-6.8-15.9-9.9-14.6-6.2-21-9.4-11.9-6.8-16.6-11-8.2-9-10.7-14.5-3.7-12.1-3.7-19.9c0-13.1 4.4-23.8 13.2-32.3s20.5-13.4 35.2-14.8v-24.4h18.4v24.9c14.1 2.1 25.2 7.9 33.3 17.4s12.1 21.6 12.1 36.3h-39.1c0-8-1.5-14.2-4.6-18.5s-7.5-6.5-13.2-6.5c-5.1 0-9 1.6-11.9 4.8-2.8 3.2-4.2 7.6-4.2 13.3s1.6 10.2 4.9 13.6 8.5 6.6 15.6 9.6c7.2 3.1 14 6.2 20.3 9.5s11.9 7 16.5 11.2 8.3 9 10.9 14.6 3.9 12.2 3.9 20c0 13.2-4.2 24-12.6 32.3s-19.8 13.2-34.2 14.6v23.3h-18.4v-23.4c-16.8-1.8-29.8-7.5-38.8-17.3s-13.5-22.6-13.5-38.6h39c0 8.8 2 15.5 5.9 20.1s9.4 6.9 16.6 6.9c5.2 0 9.4-1.6 12.4-4.7s4.7-7.3 4.7-12.8z"></path></g><g id="Shade-2" fill="#fff"><path d="m209.4 163.5-29.1 29.1h-18.6v18.6l-40.7 40.6v-90.5h66.4c8 0 15.3.7 22 2.2z" opacity=".5"></path><path d="m225.3 267 31.7 61.2v1.8h-43.6l-17-34.1z" opacity=".5"></path><path d="m311.7 275.9c0 1.1 0 2.2.1 3.2l-30 30c-6.1-9-9.2-20-9.2-33.2z" opacity=".5"></path><path d="m322.1 193.2c-2.8 3.2-4.2 7.6-4.2 13.3s1.6 10.2 4.9 13.6c3.2 3.4 8.5 6.6 15.6 9.6 5.4 2.3 10.6 4.7 15.6 7.1l-24 24c-7.3-3-14.1-6-20.3-9.1-6.4-3.2-11.9-6.8-16.6-11-4.6-4.2-8.2-9-10.6-14.5-1.7-3.8-2.8-8.1-3.4-12.9l66.5-66.5v12.9c14.1 2.1 25.2 7.9 33.3 17.4 5.6 6.7 9.3 14.6 11 23.8l-12.5 12.5h-25.5c0-8-1.5-14.2-4.6-18.5s-7.5-6.5-13.2-6.5c-5.2 0-9.1 1.6-12 4.8z" opacity=".5"></path><path d="m121 317.9 40.7-40.6v34.4l-18.3 18.3h-22.4z" opacity=".5"></path><path d="m251.2 212.2c0 3.8-.2 7.4-.7 10.7l-60.3 60.3-6.5-13h-15l78.7-78.7c2.5 6.1 3.8 13 3.8 20.7z" opacity=".5"></path><path d="m292 174c5.2-5 11.5-8.8 18.7-11.3l-30.2 30.2c2.1-7.2 5.9-13.5 11.5-18.9z" opacity=".5"></path><path d="m338.6 134.8-11.4 11.4v-11.4z" opacity=".5"></path><path d="m324.9 348v-16.2c-5.5-.6-10.6-1.6-15.2-3l26-26c4.6-.3 8.2-1.8 10.9-4.6 2.6-2.7 4.1-6.3 4.4-10.7l30.4-30.4c1.9 2.5 3.4 5.1 4.8 7.9 2.4 5 3.7 11 3.9 17.9z" opacity=".5"></path><path d="m414.5 140.1c-123 43.2-221.8 138.1-270.2 258.6-4.2-3.1-8.3-6.3-12.3-9.8-28.7-33.3-46-76.6-46-123.9 0-104.9 85.1-190 190-190 47.4 0 90.7 17.3 123.9 46 5.3 6.1 10.1 12.5 14.6 19.1z" opacity=".25"></path></g></g></g></g></svg>`}
                imageWidth={page.titleBar.icon.width} 
                imageHeight={page.titleBar.icon.height} 
                width={`${page.titleBar.icon.width}px`} 
                height={`${page.titleBar.icon.height}px`} 
                description="Reddionaire icon"
              />
            </zstack>
            <hstack 
            backgroundColor={page.titleBar.pageTitle.background}
            cornerRadius={page.titleBar.pageTitle.cornerRadius}
            padding={page.titleBar.pageTitle.padding}>
              <text size={page.titleBar.pageTitle.textSize} weight={page.titleBar.pageTitle.textWeight} color={page.titleBar.pageTitle.textColor} >Leaderboard</text>
            </hstack>
          </hstack>
          <hstack width="20%" alignment="end middle" padding="none">
            <hstack 
              onPress={handleBackToStart} 
              alignment="middle center">
              <image 
                url={svg`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="${page.titleBar.close.background}" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>`}
                imageWidth={page.titleBar.close.width} 
                imageHeight={page.titleBar.close.height} 
                width={`${page.titleBar.close.width}px`} 
                height={`${page.titleBar.close.height}px`} 
                description="Close" />
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
                      <image 
                        url={svg`<svg id="Layer_1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><circle cx="256" cy="256" fill="#ffb703" r="256"/><circle cx="256" cy="256" fill="#ffcc29" r="183.75"/><g fill="none" stroke-miterlimit="10"><circle cx="256" cy="256" r="183.75" stroke="#f99300" stroke-width="32.32"/><path d="m341.31 468.54a227.51 227.51 0 0 0 142.15-210.92" stroke="#ffcc29" stroke-linecap="round" stroke-width="19.39"/><path d="m142.26 59a226.34 226.34 0 0 1 113.74-30.46" stroke="#ffcc29" stroke-linecap="round" stroke-width="19.39"/><path d="m64.77 132.76a228.18 228.18 0 0 1 39.64-46.37" stroke="#ffcc29" stroke-linecap="round" stroke-width="19.39"/><path d="m56.22 364.84a226.58 226.58 0 0 1 -27.68-108.84" stroke="#ffcc29" stroke-linecap="round" stroke-width="19.39"/></g><path d="m303.53 237.67-44.85-64.91a3.25 3.25 0 0 0 -5.36 0l-44.85 64.91a3.26 3.26 0 0 1 -4 1.14l-63.64-28.27a3.27 3.27 0 0 0 -4.46 3.89l36.9 126.36a3.26 3.26 0 0 0 3.13 2.35h159.21a3.26 3.26 0 0 0 3.13-2.35l36.9-126.36a3.27 3.27 0 0 0 -4.46-3.89l-63.64 28.27a3.29 3.29 0 0 1 -4.01-1.14z" fill="#f99300"/></svg>`}
                        imageWidth={16} 
                        imageHeight={16} 
                        width="16px" 
                        height="16px" 
                        resizeMode="contain" 
                        description="Leaderboard icon" />
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
          <hstack width="80%" alignment="start middle" gap="small">
            <zstack>
            <image 
                url={svg`<svg id="fi_9382138" enable-background="new 0 0 512 512" height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg"><g id="Currency"><g id="BrazilReal"><g id="Coin"><g id="Bottom"><ellipse cx="256" cy="256" fill="#e88102" rx="245" ry="256"></ellipse><circle cx="256" cy="242.5" fill="#fdd835" r="242.5"></circle></g><g id="Shade" fill="#fff"><path d="m352.8 20.1-319.2 319.1c-10.7-24.5-17.4-51.1-19.4-79l259.5-259.6c27.9 2.1 54.5 8.8 79.1 19.5z" opacity=".5"></path><path d="m467.3 123.5-330.3 330.3c-20.6-11.6-39.2-26.1-55.5-43l342.9-342.8c16.8 16.2 31.3 34.9 42.9 55.5z" opacity=".5"></path><path d="m414.5 58.9-342 342c-5.3-6.2-10.4-12.7-15.1-19.4l337.7-337.7c6.7 4.7 13.2 9.8 19.4 15.1z" opacity=".5"></path><path d="m490.9 182-295.4 295.4c-8.9-2.3-17.6-5.1-26.1-8.3l313.2-313.2c3.2 8.5 6 17.2 8.3 26.1z" opacity=".5"></path><path d="m498.5 242.5c0 1.7 0 3.3-.1 5-2.6-131.6-110.1-237.5-242.4-237.5s-239.8 105.9-242.4 237.5c0-1.7-.1-3.3-.1-5 0-133.9 108.6-242.5 242.5-242.5s242.5 108.6 242.5 242.5z" opacity=".5"></path><path d="m453 253c0 104.9-85.1 190-190 190-58.9 0-111.6-26.9-146.5-69 34.7 37.5 84.3 61 139.5 61 104.9 0 190-85.1 190-190 0-46-16.3-88.1-43.5-121 31.3 33.9 50.5 79.2 50.5 129z" opacity=".5"></path></g><g id="Top"><circle cx="256" cy="245" fill="#f39e09" r="190"></circle><path d="m400 121c-33.3-28.7-76.6-46-124-46-104.9 0-190 85.1-190 190 0 47.4 17.3 90.7 46 124-40.4-34.9-66-86.4-66-144 0-104.9 85.1-190 190-190 57.5 0 109.1 25.6 144 66z" fill="#e88102"></path></g></g><g id="Icon"><g id="Bottom-2" fill="#db6704"><path d="m221.8 275.1c10.1-4.8 17.6-11 22.3-18.7 4.8-7.7 7.1-17.4 7.1-29.2v-15s-9.1-16.4-16.9-22.6c-11.3-8.9-26.9-13.3-46.9-13.3h-66.4v168.7h40.7v-59.6h22l29.8 59.6h43.5v-15zm-17-27.2c-3.9 4.1-9.7 6.1-17.4 6.1h-25.7v-46.4h25.7c7.6 0 13.4 2.1 17.4 6.2 3.9 4.1 5.9 9.9 5.9 17.1s-2 13-5.9 17z"></path><path d="m334 203.4c5.7 0 10.1 2.2 13.2 6.5s4.6 10.5 4.6 18.5h39.2v-15s-7.1-15.4-12.1-21.3c-8.1-9.5-19.2-15.4-33.3-17.4v-24.9h-18.4v24.4c-14.7 1.4-26.4 6.3-35.2 14.8-6.1 5.8-13.2 17.3-13.2 17.3v15c0 7.8 1.2 14.4 3.7 19.9s6 10.3 10.7 14.5c4.6 4.2 10.1 7.8 16.6 11 6.4 3.2 13.4 6.3 21 9.4s12.9 6.4 15.9 9.9 4.5 8.3 4.5 14.4c0 5.5-1.5 9.8-4.5 12.9s-7.1 4.7-12.4 4.7c-7.2 0-12.7-2.3-16.6-6.9s-5.9-11.3-5.9-20.1l-39-15v15c0 16 4.5 28.9 13.5 38.6 9 9.8 21.9 15.5 38.8 17.3v23.4h18.4v-23.3c14.4-1.4 25.9-6.2 34.2-14.6s12.6-19.1 12.6-32.3v-15s-2.9-2.8-3.9-5c-2.6-5.6-6.2-10.4-10.9-14.6-4.6-4.2-10.1-7.9-16.5-11.2s-13.1-6.4-20.3-9.5-12.4-6.2-15.6-9.6-4.9-7.9-4.9-13.6 1.4-10.1 4.2-13.3 6.5-4.9 11.6-4.9z"></path></g><g id="Top-2" fill="#fdd835"><path d="m183.7 270.3h-22v59.7h-40.7v-168.7h66.4c20 0 35.6 4.4 46.9 13.3s16.9 21.4 16.9 37.6c0 11.7-2.4 21.4-7.1 29.2s-12.2 14-22.3 18.7l35.2 68.1v1.7h-43.6zm-22-31.3h25.7c7.7 0 13.5-2 17.4-6.1s5.9-9.7 5.9-17-2-13-5.9-17.1-9.7-6.2-17.4-6.2h-25.7z"></path><path d="m351 285.2c0-6.1-1.5-10.9-4.5-14.4s-8.3-6.8-15.9-9.9-14.6-6.2-21-9.4-11.9-6.8-16.6-11-8.2-9-10.7-14.5-3.7-12.1-3.7-19.9c0-13.1 4.4-23.8 13.2-32.3s20.5-13.4 35.2-14.8v-24.4h18.4v24.9c14.1 2.1 25.2 7.9 33.3 17.4s12.1 21.6 12.1 36.3h-39.1c0-8-1.5-14.2-4.6-18.5s-7.5-6.5-13.2-6.5c-5.1 0-9 1.6-11.9 4.8-2.8 3.2-4.2 7.6-4.2 13.3s1.6 10.2 4.9 13.6 8.5 6.6 15.6 9.6c7.2 3.1 14 6.2 20.3 9.5s11.9 7 16.5 11.2 8.3 9 10.9 14.6 3.9 12.2 3.9 20c0 13.2-4.2 24-12.6 32.3s-19.8 13.2-34.2 14.6v23.3h-18.4v-23.4c-16.8-1.8-29.8-7.5-38.8-17.3s-13.5-22.6-13.5-38.6h39c0 8.8 2 15.5 5.9 20.1s9.4 6.9 16.6 6.9c5.2 0 9.4-1.6 12.4-4.7s4.7-7.3 4.7-12.8z"></path></g><g id="Shade-2" fill="#fff"><path d="m209.4 163.5-29.1 29.1h-18.6v18.6l-40.7 40.6v-90.5h66.4c8 0 15.3.7 22 2.2z" opacity=".5"></path><path d="m225.3 267 31.7 61.2v1.8h-43.6l-17-34.1z" opacity=".5"></path><path d="m311.7 275.9c0 1.1 0 2.2.1 3.2l-30 30c-6.1-9-9.2-20-9.2-33.2z" opacity=".5"></path><path d="m322.1 193.2c-2.8 3.2-4.2 7.6-4.2 13.3s1.6 10.2 4.9 13.6c3.2 3.4 8.5 6.6 15.6 9.6 5.4 2.3 10.6 4.7 15.6 7.1l-24 24c-7.3-3-14.1-6-20.3-9.1-6.4-3.2-11.9-6.8-16.6-11-4.6-4.2-8.2-9-10.6-14.5-1.7-3.8-2.8-8.1-3.4-12.9l66.5-66.5v12.9c14.1 2.1 25.2 7.9 33.3 17.4 5.6 6.7 9.3 14.6 11 23.8l-12.5 12.5h-25.5c0-8-1.5-14.2-4.6-18.5s-7.5-6.5-13.2-6.5c-5.2 0-9.1 1.6-12 4.8z" opacity=".5"></path><path d="m121 317.9 40.7-40.6v34.4l-18.3 18.3h-22.4z" opacity=".5"></path><path d="m251.2 212.2c0 3.8-.2 7.4-.7 10.7l-60.3 60.3-6.5-13h-15l78.7-78.7c2.5 6.1 3.8 13 3.8 20.7z" opacity=".5"></path><path d="m292 174c5.2-5 11.5-8.8 18.7-11.3l-30.2 30.2c2.1-7.2 5.9-13.5 11.5-18.9z" opacity=".5"></path><path d="m338.6 134.8-11.4 11.4v-11.4z" opacity=".5"></path><path d="m324.9 348v-16.2c-5.5-.6-10.6-1.6-15.2-3l26-26c4.6-.3 8.2-1.8 10.9-4.6 2.6-2.7 4.1-6.3 4.4-10.7l30.4-30.4c1.9 2.5 3.4 5.1 4.8 7.9 2.4 5 3.7 11 3.9 17.9z" opacity=".5"></path><path d="m414.5 140.1c-123 43.2-221.8 138.1-270.2 258.6-4.2-3.1-8.3-6.3-12.3-9.8-28.7-33.3-46-76.6-46-123.9 0-104.9 85.1-190 190-190 47.4 0 90.7 17.3 123.9 46 5.3 6.1 10.1 12.5 14.6 19.1z" opacity=".25"></path></g></g></g></g></svg>`}
                imageWidth={page.titleBar.icon.width} 
                imageHeight={page.titleBar.icon.height} 
                width={`${page.titleBar.icon.width}px`} 
                height={`${page.titleBar.icon.height}px`} 
                description="Reddionaire icon"
              />
            </zstack>
            <hstack 
            backgroundColor={page.titleBar.pageTitle.background}
            cornerRadius={page.titleBar.pageTitle.cornerRadius}
            padding={page.titleBar.pageTitle.padding}>
              <text size={page.titleBar.pageTitle.textSize} weight={page.titleBar.pageTitle.textWeight} color={page.titleBar.pageTitle.textColor} >How to Play</text>
            </hstack>
          </hstack>
          <hstack width="20%" alignment="end middle" padding="none">
            <hstack 
              onPress={handleBackToStart} 
              alignment="middle center">
              <image 
                url={svg`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="${page.titleBar.close.background}" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>`}
                imageWidth={page.titleBar.close.width} 
                imageHeight={page.titleBar.close.height} 
                width={`${page.titleBar.close.width}px`} 
                height={`${page.titleBar.close.height}px`} 
                description="Close" />
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
          <vstack gap="large" width="100%" height="100%" alignment="center" padding="large">
            <vstack gap="medium" alignment="center">
              {/* <hstack>
                <zstack>
                <image 
                url={svg`<svg id="fi_9382138" enable-background="new 0 0 512 512" height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg"><g id="Currency"><g id="BrazilReal"><g id="Coin"><g id="Bottom"><ellipse cx="256" cy="256" fill="#e88102" rx="245" ry="256"></ellipse><circle cx="256" cy="242.5" fill="#fdd835" r="242.5"></circle></g><g id="Shade" fill="#fff"><path d="m352.8 20.1-319.2 319.1c-10.7-24.5-17.4-51.1-19.4-79l259.5-259.6c27.9 2.1 54.5 8.8 79.1 19.5z" opacity=".5"></path><path d="m467.3 123.5-330.3 330.3c-20.6-11.6-39.2-26.1-55.5-43l342.9-342.8c16.8 16.2 31.3 34.9 42.9 55.5z" opacity=".5"></path><path d="m414.5 58.9-342 342c-5.3-6.2-10.4-12.7-15.1-19.4l337.7-337.7c6.7 4.7 13.2 9.8 19.4 15.1z" opacity=".5"></path><path d="m490.9 182-295.4 295.4c-8.9-2.3-17.6-5.1-26.1-8.3l313.2-313.2c3.2 8.5 6 17.2 8.3 26.1z" opacity=".5"></path><path d="m498.5 242.5c0 1.7 0 3.3-.1 5-2.6-131.6-110.1-237.5-242.4-237.5s-239.8 105.9-242.4 237.5c0-1.7-.1-3.3-.1-5 0-133.9 108.6-242.5 242.5-242.5s242.5 108.6 242.5 242.5z" opacity=".5"></path><path d="m453 253c0 104.9-85.1 190-190 190-58.9 0-111.6-26.9-146.5-69 34.7 37.5 84.3 61 139.5 61 104.9 0 190-85.1 190-190 0-46-16.3-88.1-43.5-121 31.3 33.9 50.5 79.2 50.5 129z" opacity=".5"></path></g><g id="Top"><circle cx="256" cy="245" fill="#f39e09" r="190"></circle><path d="m400 121c-33.3-28.7-76.6-46-124-46-104.9 0-190 85.1-190 190 0 47.4 17.3 90.7 46 124-40.4-34.9-66-86.4-66-144 0-104.9 85.1-190 190-190 57.5 0 109.1 25.6 144 66z" fill="#e88102"></path></g></g><g id="Icon"><g id="Bottom-2" fill="#db6704"><path d="m221.8 275.1c10.1-4.8 17.6-11 22.3-18.7 4.8-7.7 7.1-17.4 7.1-29.2v-15s-9.1-16.4-16.9-22.6c-11.3-8.9-26.9-13.3-46.9-13.3h-66.4v168.7h40.7v-59.6h22l29.8 59.6h43.5v-15zm-17-27.2c-3.9 4.1-9.7 6.1-17.4 6.1h-25.7v-46.4h25.7c7.6 0 13.4 2.1 17.4 6.2 3.9 4.1 5.9 9.9 5.9 17.1s-2 13-5.9 17z"></path><path d="m334 203.4c5.7 0 10.1 2.2 13.2 6.5s4.6 10.5 4.6 18.5h39.2v-15s-7.1-15.4-12.1-21.3c-8.1-9.5-19.2-15.4-33.3-17.4v-24.9h-18.4v24.4c-14.7 1.4-26.4 6.3-35.2 14.8-6.1 5.8-13.2 17.3-13.2 17.3v15c0 7.8 1.2 14.4 3.7 19.9s6 10.3 10.7 14.5c4.6 4.2 10.1 7.8 16.6 11 6.4 3.2 13.4 6.3 21 9.4s12.9 6.4 15.9 9.9 4.5 8.3 4.5 14.4c0 5.5-1.5 9.8-4.5 12.9s-7.1 4.7-12.4 4.7c-7.2 0-12.7-2.3-16.6-6.9s-5.9-11.3-5.9-20.1l-39-15v15c0 16 4.5 28.9 13.5 38.6 9 9.8 21.9 15.5 38.8 17.3v23.4h18.4v-23.3c14.4-1.4 25.9-6.2 34.2-14.6s12.6-19.1 12.6-32.3v-15s-2.9-2.8-3.9-5c-2.6-5.6-6.2-10.4-10.9-14.6-4.6-4.2-10.1-7.9-16.5-11.2s-13.1-6.4-20.3-9.5-12.4-6.2-15.6-9.6-4.9-7.9-4.9-13.6 1.4-10.1 4.2-13.3 6.5-4.9 11.6-4.9z"></path></g><g id="Top-2" fill="#fdd835"><path d="m183.7 270.3h-22v59.7h-40.7v-168.7h66.4c20 0 35.6 4.4 46.9 13.3s16.9 21.4 16.9 37.6c0 11.7-2.4 21.4-7.1 29.2s-12.2 14-22.3 18.7l35.2 68.1v1.7h-43.6zm-22-31.3h25.7c7.7 0 13.5-2 17.4-6.1s5.9-9.7 5.9-17-2-13-5.9-17.1-9.7-6.2-17.4-6.2h-25.7z"></path><path d="m351 285.2c0-6.1-1.5-10.9-4.5-14.4s-8.3-6.8-15.9-9.9-14.6-6.2-21-9.4-11.9-6.8-16.6-11-8.2-9-10.7-14.5-3.7-12.1-3.7-19.9c0-13.1 4.4-23.8 13.2-32.3s20.5-13.4 35.2-14.8v-24.4h18.4v24.9c14.1 2.1 25.2 7.9 33.3 17.4s12.1 21.6 12.1 36.3h-39.1c0-8-1.5-14.2-4.6-18.5s-7.5-6.5-13.2-6.5c-5.1 0-9 1.6-11.9 4.8-2.8 3.2-4.2 7.6-4.2 13.3s1.6 10.2 4.9 13.6 8.5 6.6 15.6 9.6c7.2 3.1 14 6.2 20.3 9.5s11.9 7 16.5 11.2 8.3 9 10.9 14.6 3.9 12.2 3.9 20c0 13.2-4.2 24-12.6 32.3s-19.8 13.2-34.2 14.6v23.3h-18.4v-23.4c-16.8-1.8-29.8-7.5-38.8-17.3s-13.5-22.6-13.5-38.6h39c0 8.8 2 15.5 5.9 20.1s9.4 6.9 16.6 6.9c5.2 0 9.4-1.6 12.4-4.7s4.7-7.3 4.7-12.8z"></path></g><g id="Shade-2" fill="#fff"><path d="m209.4 163.5-29.1 29.1h-18.6v18.6l-40.7 40.6v-90.5h66.4c8 0 15.3.7 22 2.2z" opacity=".5"></path><path d="m225.3 267 31.7 61.2v1.8h-43.6l-17-34.1z" opacity=".5"></path><path d="m311.7 275.9c0 1.1 0 2.2.1 3.2l-30 30c-6.1-9-9.2-20-9.2-33.2z" opacity=".5"></path><path d="m322.1 193.2c-2.8 3.2-4.2 7.6-4.2 13.3s1.6 10.2 4.9 13.6c3.2 3.4 8.5 6.6 15.6 9.6 5.4 2.3 10.6 4.7 15.6 7.1l-24 24c-7.3-3-14.1-6-20.3-9.1-6.4-3.2-11.9-6.8-16.6-11-4.6-4.2-8.2-9-10.6-14.5-1.7-3.8-2.8-8.1-3.4-12.9l66.5-66.5v12.9c14.1 2.1 25.2 7.9 33.3 17.4 5.6 6.7 9.3 14.6 11 23.8l-12.5 12.5h-25.5c0-8-1.5-14.2-4.6-18.5s-7.5-6.5-13.2-6.5c-5.2 0-9.1 1.6-12 4.8z" opacity=".5"></path><path d="m121 317.9 40.7-40.6v34.4l-18.3 18.3h-22.4z" opacity=".5"></path><path d="m251.2 212.2c0 3.8-.2 7.4-.7 10.7l-60.3 60.3-6.5-13h-15l78.7-78.7c2.5 6.1 3.8 13 3.8 20.7z" opacity=".5"></path><path d="m292 174c5.2-5 11.5-8.8 18.7-11.3l-30.2 30.2c2.1-7.2 5.9-13.5 11.5-18.9z" opacity=".5"></path><path d="m338.6 134.8-11.4 11.4v-11.4z" opacity=".5"></path><path d="m324.9 348v-16.2c-5.5-.6-10.6-1.6-15.2-3l26-26c4.6-.3 8.2-1.8 10.9-4.6 2.6-2.7 4.1-6.3 4.4-10.7l30.4-30.4c1.9 2.5 3.4 5.1 4.8 7.9 2.4 5 3.7 11 3.9 17.9z" opacity=".5"></path><path d="m414.5 140.1c-123 43.2-221.8 138.1-270.2 258.6-4.2-3.1-8.3-6.3-12.3-9.8-28.7-33.3-46-76.6-46-123.9 0-104.9 85.1-190 190-190 47.4 0 90.7 17.3 123.9 46 5.3 6.1 10.1 12.5 14.6 19.1z" opacity=".25"></path></g></g></g></g></svg>`}
                imageWidth={logo.icon.width} 
                imageHeight={logo.icon.height} 
                width={`${logo.icon.width}px`} 
                height={`${logo.icon.height}px`} 
                description="Reddionaire icon"
              />
                </zstack>
                <hstack backgroundColor={logo.background} cornerRadius={logo.cornerRadius} padding={logo.padding}>
                  <text size={logo.textSize} weight={logo.textWeight} color={logo.textColor}>Reddionaire</text>
              </hstack>
            </hstack> */}
                <vstack alignment="center">
                  <text size="large" weight="bold" color={colors.accent}>
                    Test your knowledge with 12  
                  </text>
                  <text size="large" weight="bold" color={colors.accent}>
                  questions and win up to
                  </text>
                  <text size="xlarge" weight="bold" color={colors.accent}>
                      R$1,000,000
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
              <image 
                url={svg`<svg id="Layer_1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><circle cx="256" cy="256" fill="#ffb703" r="256"/><circle cx="256" cy="256" fill="#ffcc29" r="183.75"/><g fill="none" stroke-miterlimit="10"><circle cx="256" cy="256" r="183.75" stroke="#f99300" stroke-width="32.32"/><path d="m341.31 468.54a227.51 227.51 0 0 0 142.15-210.92" stroke="#ffcc29" stroke-linecap="round" stroke-width="19.39"/><path d="m142.26 59a226.34 226.34 0 0 1 113.74-30.46" stroke="#ffcc29" stroke-linecap="round" stroke-width="19.39"/><path d="m64.77 132.76a228.18 228.18 0 0 1 39.64-46.37" stroke="#ffcc29" stroke-linecap="round" stroke-width="19.39"/><path d="m56.22 364.84a226.58 226.58 0 0 1 -27.68-108.84" stroke="#ffcc29" stroke-linecap="round" stroke-width="19.39"/></g><path d="m303.53 237.67-44.85-64.91a3.25 3.25 0 0 0 -5.36 0l-44.85 64.91a3.26 3.26 0 0 1 -4 1.14l-63.64-28.27a3.27 3.27 0 0 0 -4.46 3.89l36.9 126.36a3.26 3.26 0 0 0 3.13 2.35h159.21a3.26 3.26 0 0 0 3.13-2.35l36.9-126.36a3.27 3.27 0 0 0 -4.46-3.89l-63.64 28.27a3.29 3.29 0 0 1 -4.01-1.14z" fill="#f99300"/></svg>`}
                imageWidth={20} 
                imageHeight={20} 
                width="20px" 
                height="20px" 
                resizeMode="contain" 
                description="Leaderboard icon" />
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
              <hstack width="80%" alignment="start middle" gap="small">
                <zstack>
            <image 
                url={svg`<svg id="fi_9382138" enable-background="new 0 0 512 512" height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg"><g id="Currency"><g id="BrazilReal"><g id="Coin"><g id="Bottom"><ellipse cx="256" cy="256" fill="#e88102" rx="245" ry="256"></ellipse><circle cx="256" cy="242.5" fill="#fdd835" r="242.5"></circle></g><g id="Shade" fill="#fff"><path d="m352.8 20.1-319.2 319.1c-10.7-24.5-17.4-51.1-19.4-79l259.5-259.6c27.9 2.1 54.5 8.8 79.1 19.5z" opacity=".5"></path><path d="m467.3 123.5-330.3 330.3c-20.6-11.6-39.2-26.1-55.5-43l342.9-342.8c16.8 16.2 31.3 34.9 42.9 55.5z" opacity=".5"></path><path d="m414.5 58.9-342 342c-5.3-6.2-10.4-12.7-15.1-19.4l337.7-337.7c6.7 4.7 13.2 9.8 19.4 15.1z" opacity=".5"></path><path d="m490.9 182-295.4 295.4c-8.9-2.3-17.6-5.1-26.1-8.3l313.2-313.2c3.2 8.5 6 17.2 8.3 26.1z" opacity=".5"></path><path d="m498.5 242.5c0 1.7 0 3.3-.1 5-2.6-131.6-110.1-237.5-242.4-237.5s-239.8 105.9-242.4 237.5c0-1.7-.1-3.3-.1-5 0-133.9 108.6-242.5 242.5-242.5s242.5 108.6 242.5 242.5z" opacity=".5"></path><path d="m453 253c0 104.9-85.1 190-190 190-58.9 0-111.6-26.9-146.5-69 34.7 37.5 84.3 61 139.5 61 104.9 0 190-85.1 190-190 0-46-16.3-88.1-43.5-121 31.3 33.9 50.5 79.2 50.5 129z" opacity=".5"></path></g><g id="Top"><circle cx="256" cy="245" fill="#f39e09" r="190"></circle><path d="m400 121c-33.3-28.7-76.6-46-124-46-104.9 0-190 85.1-190 190 0 47.4 17.3 90.7 46 124-40.4-34.9-66-86.4-66-144 0-104.9 85.1-190 190-190 57.5 0 109.1 25.6 144 66z" fill="#e88102"></path></g></g><g id="Icon"><g id="Bottom-2" fill="#db6704"><path d="m221.8 275.1c10.1-4.8 17.6-11 22.3-18.7 4.8-7.7 7.1-17.4 7.1-29.2v-15s-9.1-16.4-16.9-22.6c-11.3-8.9-26.9-13.3-46.9-13.3h-66.4v168.7h40.7v-59.6h22l29.8 59.6h43.5v-15zm-17-27.2c-3.9 4.1-9.7 6.1-17.4 6.1h-25.7v-46.4h25.7c7.6 0 13.4 2.1 17.4 6.2 3.9 4.1 5.9 9.9 5.9 17.1s-2 13-5.9 17z"></path><path d="m334 203.4c5.7 0 10.1 2.2 13.2 6.5s4.6 10.5 4.6 18.5h39.2v-15s-7.1-15.4-12.1-21.3c-8.1-9.5-19.2-15.4-33.3-17.4v-24.9h-18.4v24.4c-14.7 1.4-26.4 6.3-35.2 14.8-6.1 5.8-13.2 17.3-13.2 17.3v15c0 7.8 1.2 14.4 3.7 19.9s6 10.3 10.7 14.5c4.6 4.2 10.1 7.8 16.6 11 6.4 3.2 13.4 6.3 21 9.4s12.9 6.4 15.9 9.9 4.5 8.3 4.5 14.4c0 5.5-1.5 9.8-4.5 12.9s-7.1 4.7-12.4 4.7c-7.2 0-12.7-2.3-16.6-6.9s-5.9-11.3-5.9-20.1l-39-15v15c0 16 4.5 28.9 13.5 38.6 9 9.8 21.9 15.5 38.8 17.3v23.4h18.4v-23.3c14.4-1.4 25.9-6.2 34.2-14.6s12.6-19.1 12.6-32.3v-15s-2.9-2.8-3.9-5c-2.6-5.6-6.2-10.4-10.9-14.6-4.6-4.2-10.1-7.9-16.5-11.2s-13.1-6.4-20.3-9.5-12.4-6.2-15.6-9.6-4.9-7.9-4.9-13.6 1.4-10.1 4.2-13.3 6.5-4.9 11.6-4.9z"></path></g><g id="Top-2" fill="#fdd835"><path d="m183.7 270.3h-22v59.7h-40.7v-168.7h66.4c20 0 35.6 4.4 46.9 13.3s16.9 21.4 16.9 37.6c0 11.7-2.4 21.4-7.1 29.2s-12.2 14-22.3 18.7l35.2 68.1v1.7h-43.6zm-22-31.3h25.7c7.7 0 13.5-2 17.4-6.1s5.9-9.7 5.9-17-2-13-5.9-17.1-9.7-6.2-17.4-6.2h-25.7z"></path><path d="m351 285.2c0-6.1-1.5-10.9-4.5-14.4s-8.3-6.8-15.9-9.9-14.6-6.2-21-9.4-11.9-6.8-16.6-11-8.2-9-10.7-14.5-3.7-12.1-3.7-19.9c0-13.1 4.4-23.8 13.2-32.3s20.5-13.4 35.2-14.8v-24.4h18.4v24.9c14.1 2.1 25.2 7.9 33.3 17.4s12.1 21.6 12.1 36.3h-39.1c0-8-1.5-14.2-4.6-18.5s-7.5-6.5-13.2-6.5c-5.1 0-9 1.6-11.9 4.8-2.8 3.2-4.2 7.6-4.2 13.3s1.6 10.2 4.9 13.6 8.5 6.6 15.6 9.6c7.2 3.1 14 6.2 20.3 9.5s11.9 7 16.5 11.2 8.3 9 10.9 14.6 3.9 12.2 3.9 20c0 13.2-4.2 24-12.6 32.3s-19.8 13.2-34.2 14.6v23.3h-18.4v-23.4c-16.8-1.8-29.8-7.5-38.8-17.3s-13.5-22.6-13.5-38.6h39c0 8.8 2 15.5 5.9 20.1s9.4 6.9 16.6 6.9c5.2 0 9.4-1.6 12.4-4.7s4.7-7.3 4.7-12.8z"></path></g><g id="Shade-2" fill="#fff"><path d="m209.4 163.5-29.1 29.1h-18.6v18.6l-40.7 40.6v-90.5h66.4c8 0 15.3.7 22 2.2z" opacity=".5"></path><path d="m225.3 267 31.7 61.2v1.8h-43.6l-17-34.1z" opacity=".5"></path><path d="m311.7 275.9c0 1.1 0 2.2.1 3.2l-30 30c-6.1-9-9.2-20-9.2-33.2z" opacity=".5"></path><path d="m322.1 193.2c-2.8 3.2-4.2 7.6-4.2 13.3s1.6 10.2 4.9 13.6c3.2 3.4 8.5 6.6 15.6 9.6 5.4 2.3 10.6 4.7 15.6 7.1l-24 24c-7.3-3-14.1-6-20.3-9.1-6.4-3.2-11.9-6.8-16.6-11-4.6-4.2-8.2-9-10.6-14.5-1.7-3.8-2.8-8.1-3.4-12.9l66.5-66.5v12.9c14.1 2.1 25.2 7.9 33.3 17.4 5.6 6.7 9.3 14.6 11 23.8l-12.5 12.5h-25.5c0-8-1.5-14.2-4.6-18.5s-7.5-6.5-13.2-6.5c-5.2 0-9.1 1.6-12 4.8z" opacity=".5"></path><path d="m121 317.9 40.7-40.6v34.4l-18.3 18.3h-22.4z" opacity=".5"></path><path d="m251.2 212.2c0 3.8-.2 7.4-.7 10.7l-60.3 60.3-6.5-13h-15l78.7-78.7c2.5 6.1 3.8 13 3.8 20.7z" opacity=".5"></path><path d="m292 174c5.2-5 11.5-8.8 18.7-11.3l-30.2 30.2c2.1-7.2 5.9-13.5 11.5-18.9z" opacity=".5"></path><path d="m338.6 134.8-11.4 11.4v-11.4z" opacity=".5"></path><path d="m324.9 348v-16.2c-5.5-.6-10.6-1.6-15.2-3l26-26c4.6-.3 8.2-1.8 10.9-4.6 2.6-2.7 4.1-6.3 4.4-10.7l30.4-30.4c1.9 2.5 3.4 5.1 4.8 7.9 2.4 5 3.7 11 3.9 17.9z" opacity=".5"></path><path d="m414.5 140.1c-123 43.2-221.8 138.1-270.2 258.6-4.2-3.1-8.3-6.3-12.3-9.8-28.7-33.3-46-76.6-46-123.9 0-104.9 85.1-190 190-190 47.4 0 90.7 17.3 123.9 46 5.3 6.1 10.1 12.5 14.6 19.1z" opacity=".25"></path></g></g></g></g></svg>`}
                imageWidth={page.titleBar.icon.width} 
                imageHeight={page.titleBar.icon.height} 
                width={`${page.titleBar.icon.width}px`} 
                height={`${page.titleBar.icon.height}px`} 
                description="Reddionaire icon"
              />
                </zstack>
                <hstack 
            backgroundColor={page.titleBar.pageTitle.background}
            cornerRadius={page.titleBar.pageTitle.cornerRadius}
            padding={page.titleBar.pageTitle.padding}>
              <text size={page.titleBar.pageTitle.textSize} weight={page.titleBar.pageTitle.textWeight} color={page.titleBar.pageTitle.textColor}>Reddionaire</text>
                </hstack>
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
