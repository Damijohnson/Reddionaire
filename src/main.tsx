// Learn more at developers.reddit.com/docs
import { Devvit, useState, TriggerContext } from "@devvit/public-api";

Devvit.configure({
  redditAPI: true,
});

// Game constants
const MONEY_LADDER = [
  { question: 1, amount: "$100", milestone: false },
  { question: 2, amount: "$200", milestone: false },
  { question: 3, amount: "$300", milestone: false },
  { question: 4, amount: "$500", milestone: true },
  { question: 5, amount: "$1,000", milestone: false },
  { question: 6, amount: "$2,000", milestone: false },
  { question: 7, amount: "$4,000", milestone: false },
  { question: 8, amount: "$8,000", milestone: true },
  { question: 9, amount: "$16,000", milestone: false },
  { question: 10, amount: "$32,000", milestone: false },
  { question: 11, amount: "$64,000", milestone: false },
  { question: 12, amount: "$125,000", milestone: true },
  { question: 13, amount: "$250,000", milestone: false },
  { question: 14, amount: "$500,000", milestone: false },
  { question: 15, amount: "$1,000,000", milestone: true },
];

// Sample questions for MVP
const QUESTIONS = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: 2,
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1,
  },
  {
    id: 3,
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: 1,
  },
  {
    id: 4,
    question: "Who wrote 'Romeo and Juliet'?",
    options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
    correctAnswer: 1,
  },
  {
    id: 5,
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correctAnswer: 3,
  },
  {
    id: 6,
    question: "What year did World War II end?",
    options: ["1943", "1944", "1945", "1946"],
    correctAnswer: 2,
  },
  {
    id: 7,
    question: "What is the chemical symbol for gold?",
    options: ["Ag", "Au", "Fe", "Cu"],
    correctAnswer: 1,
  },
  {
    id: 8,
    question: "Which country is home to the kangaroo?",
    options: ["New Zealand", "South Africa", "Australia", "India"],
    correctAnswer: 2,
  },
  {
    id: 9,
    question: "What is the square root of 144?",
    options: ["10", "11", "12", "13"],
    correctAnswer: 2,
  },
  {
    id: 10,
    question: "Who painted the Mona Lisa?",
    options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
    correctAnswer: 2,
  },
  {
    id: 11,
    question: "What is the largest mammal?",
    options: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
    correctAnswer: 1,
  },
  {
    id: 12,
    question: "In which year did the first moon landing occur?",
    options: ["1967", "1968", "1969", "1970"],
    correctAnswer: 2,
  },
  {
    id: 13,
    question: "What is the speed of light?",
    options: ["186,000 mph", "186,000 km/s", "186,000 m/s", "186,000 km/h"],
    correctAnswer: 1,
  },
  {
    id: 14,
    question: "Which element has the chemical symbol 'O'?",
    options: ["Osmium", "Oxygen", "Oganesson", "Osmium"],
    correctAnswer: 1,
  },
  {
    id: 15,
    question: "What is the largest country by land area?",
    options: ["China", "United States", "Canada", "Russia"],
    correctAnswer: 3,
  },
];

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
    title: "🎯 Who Wants to Be a Redditionaire? - Test Your Knowledge!",
    subredditName: subreddit.name,
    preview: (
      <vstack height="100%" width="100%" alignment="middle center">
        <text size="large">🎯 Redditionaire Game Loading...</text>
      </vstack>
    ),
  });

  return post;
};

// Add a menu item to the subreddit menu for instantiating the new experience post
Devvit.addMenuItem({
  label: "🎯 Start Redditionaire Game",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    ui.showToast(
      "🎯 Starting Redditionaire game - you'll be redirected to the game post!"
    );

    const post = await createPost(context);

    ui.navigateTo(post);
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
  height: "regular",
  render: (context) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState<string>("$0");
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'won' | 'lost' | 'walked'>('waiting');
    const [fiftyFifty, setFiftyFifty] = useState(true);
    const [askAudience, setAskAudience] = useState(true);
    const [phoneFriend, setPhoneFriend] = useState(true);
    const [usedLifelines, setUsedLifelines] = useState<string[]>([]);
    const [showWalkAway, setShowWalkAway] = useState(false);

    const startGame = () => {
      setCurrentQuestion(0);
      setScore("$0");
      setGameStatus('playing');
      setFiftyFifty(true);
      setAskAudience(true);
      setPhoneFriend(true);
      setUsedLifelines([]);
      setShowWalkAway(false);
    };

    const answerQuestion = (selectedAnswer: number) => {
      const currentQ = QUESTIONS[currentQuestion];
      const isCorrect = selectedAnswer === currentQ.correctAnswer;
      
      if (isCorrect) {
        const newScore = MONEY_LADDER[currentQuestion].amount;
        const nextQuestion = currentQuestion + 1;
        
        if (nextQuestion >= QUESTIONS.length) {
          // Won the game!
          setScore(newScore);
          setGameStatus('won');
        } else {
          // Check if it's a milestone question
          const isMilestone = MONEY_LADDER[nextQuestion].milestone;
          if (isMilestone) {
            setShowWalkAway(true);
          }
          
          setCurrentQuestion(nextQuestion);
          setScore(newScore);
        }
      } else {
        // Wrong answer - game over
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

    const useLifeline = (lifeline: string) => {
      if (lifeline === 'fiftyFifty' && fiftyFifty) {
        setFiftyFifty(false);
        setUsedLifelines(prev => [...prev, lifeline]);
      } else if (lifeline === 'askAudience' && askAudience) {
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
    };

    const renderMoneyLadder = () => (
      <vstack gap="small" width="100%">
        <text size="medium" weight="bold">💰 Money Ladder</text>
        {MONEY_LADDER.map((rung, index) => (
          <hstack 
            key={index.toString()} 
            width="100%" 
            padding="small" 
            backgroundColor={index === currentQuestion ? "#FFD700" : 
                          index < currentQuestion ? "#90EE90" : "#F0F0F0"}
            cornerRadius="medium"
          >
            <text size="small" width="60px">{rung.question}.</text>
            <text size="small" weight={rung.milestone ? "bold" : undefined}>{rung.amount}</text>
            {rung.milestone && <text size="small" color="blue">★</text>}
          </hstack>
        ))}
      </vstack>
    );

    const renderLifelines = () => (
      <hstack gap="small" width="100%">
        <button
          appearance={fiftyFifty ? "primary" : "secondary"}
          disabled={!fiftyFifty}
          onPress={() => useLifeline('fiftyFifty')}
          size="small"
        >
          50:50
        </button>
        <button
          appearance={askAudience ? "primary" : "secondary"}
          disabled={!askAudience}
          onPress={() => useLifeline('askAudience')}
          size="small"
        >
          👥 Ask Audience
        </button>
        <button
          appearance={phoneFriend ? "primary" : "secondary"}
          disabled={!phoneFriend}
          onPress={() => useLifeline('phoneFriend')}
          size="small"
        >
          📞 Phone Friend
        </button>
      </hstack>
    );

    const renderQuestion = () => {
      const currentQ = QUESTIONS[currentQuestion];
      return (
        <vstack gap="medium" width="100%">
          <text size="large" weight="bold" alignment="center">
            Question {currentQ.id}
          </text>
          <text size="medium" alignment="center">
            {currentQ.question}
          </text>
          <vstack gap="small" width="100%">
            {currentQ.options.map((option, index) => (
              <button
                key={index.toString()}
                appearance="primary"
                onPress={() => answerQuestion(index)}
                width="100%"
              >
                {String.fromCharCode(65 + index)}. {option}
              </button>
            ))}
          </vstack>
        </vstack>
      );
    };

    const renderGameOver = () => (
      <vstack gap="medium" width="100%" alignment="center">
        <text size="xlarge" weight="bold">
          {gameStatus === 'won' ? '🎉 CONGRATULATIONS! 🎉' : 
           gameStatus === 'lost' ? '❌ Game Over!' : '🚶 Walked Away!'}
        </text>
        <text size="large">
          {gameStatus === 'won' ? `You won $1,000,000!` :
           gameStatus === 'lost' ? `You lost at question ${currentQuestion + 1}` :
           `You walked away with ${score}!`}
        </text>
        <button appearance="primary" onPress={resetGame}>
          Play Again
        </button>
      </vstack>
    );

    const renderWalkAwayPrompt = () => (
      <vstack gap="medium" width="100%" alignment="center">
        <text size="large" weight="bold">🎯 Milestone Reached!</text>
        <text size="medium">
          You've secured {MONEY_LADDER[currentQuestion].amount}!
        </text>
        <text size="medium">Do you want to continue or walk away?</text>
        <hstack gap="medium">
          <button appearance="primary" onPress={continueGame}>
            Continue Playing
          </button>
          <button appearance="secondary" onPress={walkAway}>
            Walk Away
          </button>
        </hstack>
      </vstack>
    );

    return (
      <vstack height="100%" width="100%" gap="medium" padding="medium">
        <text size="xlarge" weight="bold" alignment="center">
          🎯 Who Wants to Be a Redditionaire?
        </text>
        
        {gameStatus === 'waiting' && (
          <vstack gap="medium" width="100%" alignment="center">
            <text size="large">Test your knowledge and win up to $1,000,000!</text>
            <button appearance="primary" onPress={startGame} size="large">
              🚀 Start Game
            </button>
          </vstack>
        )}

        {gameStatus === 'playing' && (
          <hstack gap="large" width="100%" height="100%">
            <vstack width="60%" height="100%">
              {renderQuestion()}
              {renderLifelines()}
            </vstack>
            <vstack width="40%" height="100%">
              {renderMoneyLadder()}
            </vstack>
          </hstack>
        )}

        {showWalkAway && renderWalkAwayPrompt()}
        
        {(gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'walked') && 
          renderGameOver()}
      </vstack>
    );
  },
});

export default Devvit;
