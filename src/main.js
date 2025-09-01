// Learn more at developers.reddit.com/docs
import { Devvit, useState } from "@devvit/public-api";
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
const createPost = async (context) => {
    const { reddit } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
        title: "🎯 Who Wants to Be a Redditionaire? - Test Your Knowledge!",
        subredditName: subreddit.name,
        preview: (Devvit.createElement("vstack", { height: "100%", width: "100%", alignment: "middle center" },
            Devvit.createElement("text", { size: "large" }, "\uD83C\uDFAF Redditionaire Game Loading..."))),
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
        ui.showToast("🎯 Starting Redditionaire game - you'll be redirected to the game post!");
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
        const [score, setScore] = useState("$0");
        const [gameStatus, setGameStatus] = useState('waiting');
        const [fiftyFifty, setFiftyFifty] = useState(true);
        const [askAudience, setAskAudience] = useState(true);
        const [phoneFriend, setPhoneFriend] = useState(true);
        const [usedLifelines, setUsedLifelines] = useState([]);
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
        const answerQuestion = (selectedAnswer) => {
            const currentQ = QUESTIONS[currentQuestion];
            const isCorrect = selectedAnswer === currentQ.correctAnswer;
            if (isCorrect) {
                const newScore = MONEY_LADDER[currentQuestion].amount;
                const nextQuestion = currentQuestion + 1;
                if (nextQuestion >= QUESTIONS.length) {
                    // Won the game!
                    setScore(newScore);
                    setGameStatus('won');
                }
                else {
                    // Check if it's a milestone question
                    const isMilestone = MONEY_LADDER[nextQuestion].milestone;
                    if (isMilestone) {
                        setShowWalkAway(true);
                    }
                    setCurrentQuestion(nextQuestion);
                    setScore(newScore);
                }
            }
            else {
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
        const useLifeline = (lifeline) => {
            if (lifeline === 'fiftyFifty' && fiftyFifty) {
                setFiftyFifty(false);
                setUsedLifelines(prev => [...prev, lifeline]);
            }
            else if (lifeline === 'askAudience' && askAudience) {
                setAskAudience(false);
                setUsedLifelines(prev => [...prev, lifeline]);
            }
            else if (lifeline === 'phoneFriend' && phoneFriend) {
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
        const renderMoneyLadder = () => (Devvit.createElement("vstack", { gap: "small", width: "100%" },
            Devvit.createElement("text", { size: "medium", weight: "bold" }, "\uD83D\uDCB0 Money Ladder"),
            MONEY_LADDER.map((rung, index) => (Devvit.createElement("hstack", { key: index, width: "100%", padding: "small", backgroundColor: index === currentQuestion ? "#FFD700" :
                    index < currentQuestion ? "#90EE90" : "#F0F0F0", borderRadius: "medium" },
                Devvit.createElement("text", { size: "small", width: "60px" },
                    rung.question,
                    "."),
                Devvit.createElement("text", { size: "small", weight: rung.milestone ? "bold" : undefined }, rung.amount),
                rung.milestone && Devvit.createElement("text", { size: "small", color: "blue" }, "\u2605"))))));
        const renderLifelines = () => (Devvit.createElement("hstack", { gap: "small", width: "100%" },
            Devvit.createElement("button", { appearance: fiftyFifty ? "primary" : "secondary", disabled: !fiftyFifty, onPress: () => useLifeline('fiftyFifty'), size: "small" }, "50:50"),
            Devvit.createElement("button", { appearance: askAudience ? "primary" : "secondary", disabled: !askAudience, onPress: () => useLifeline('askAudience'), size: "small" }, "\uD83D\uDC65 Ask Audience"),
            Devvit.createElement("button", { appearance: phoneFriend ? "primary" : "secondary", disabled: !phoneFriend, onPress: () => useLifeline('phoneFriend'), size: "small" }, "\uD83D\uDCDE Phone Friend")));
        const renderQuestion = () => {
            const currentQ = QUESTIONS[currentQuestion];
            return (Devvit.createElement("vstack", { gap: "medium", width: "100%" },
                Devvit.createElement("text", { size: "large", weight: "bold", alignment: "center" },
                    "Question ",
                    currentQ.id),
                Devvit.createElement("text", { size: "medium", alignment: "center" }, currentQ.question),
                Devvit.createElement("vstack", { gap: "small", width: "100%" }, currentQ.options.map((option, index) => (Devvit.createElement("button", { key: index, appearance: "primary", onPress: () => answerQuestion(index), width: "100%" },
                    String.fromCharCode(65 + index),
                    ". ",
                    option))))));
        };
        const renderGameOver = () => (Devvit.createElement("vstack", { gap: "medium", width: "100%", alignment: "center" },
            Devvit.createElement("text", { size: "xlarge", weight: "bold" }, gameStatus === 'won' ? '🎉 CONGRATULATIONS! 🎉' :
                gameStatus === 'lost' ? '❌ Game Over!' : '🚶 Walked Away!'),
            Devvit.createElement("text", { size: "large" }, gameStatus === 'won' ? `You won $1,000,000!` :
                gameStatus === 'lost' ? `You lost at question ${currentQuestion + 1}` :
                    `You walked away with ${score}!`),
            Devvit.createElement("button", { appearance: "primary", onPress: resetGame }, "Play Again")));
        const renderWalkAwayPrompt = () => (Devvit.createElement("vstack", { gap: "medium", width: "100%", alignment: "center" },
            Devvit.createElement("text", { size: "large", weight: "bold" }, "\uD83C\uDFAF Milestone Reached!"),
            Devvit.createElement("text", { size: "medium" },
                "You've secured ",
                MONEY_LADDER[currentQuestion].amount,
                "!"),
            Devvit.createElement("text", { size: "medium" }, "Do you want to continue or walk away?"),
            Devvit.createElement("hstack", { gap: "medium" },
                Devvit.createElement("button", { appearance: "primary", onPress: continueGame }, "Continue Playing"),
                Devvit.createElement("button", { appearance: "secondary", onPress: walkAway }, "Walk Away"))));
        return (Devvit.createElement("vstack", { height: "100%", width: "100%", gap: "medium", padding: "medium" },
            Devvit.createElement("text", { size: "xlarge", weight: "bold", alignment: "center" }, "\uD83C\uDFAF Who Wants to Be a Redditionaire?"),
            gameStatus === 'waiting' && (Devvit.createElement("vstack", { gap: "medium", width: "100%", alignment: "center" },
                Devvit.createElement("text", { size: "large" }, "Test your knowledge and win up to $1,000,000!"),
                Devvit.createElement("button", { appearance: "primary", onPress: startGame, size: "large" }, "\uD83D\uDE80 Start Game"))),
            gameStatus === 'playing' && (Devvit.createElement("hstack", { gap: "large", width: "100%", height: "100%" },
                Devvit.createElement("vstack", { width: "60%", height: "100%" },
                    renderQuestion(),
                    renderLifelines()),
                Devvit.createElement("vstack", { width: "40%", height: "100%" }, renderMoneyLadder()))),
            showWalkAway && renderWalkAwayPrompt(),
            (gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'walked') &&
                renderGameOver()));
    },
});
export default Devvit;
