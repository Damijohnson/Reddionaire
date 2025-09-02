// Learn more at developers.reddit.com/docs
import { Devvit, useState } from "@devvit/public-api";
import questionsData from "./questions.json" with { type: "json" };
Devvit.configure({
    redditAPI: true,
    redis: true,
});
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
const getQuestionsForGame = (subredditId, date) => {
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
    const selectedQuestions = [];
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
        const fallbackQuestions = questionsData.rotationRules.fallbackQuestions.map(id => questionsData.questions.find(q => q.id === id)).filter(Boolean);
        selectedQuestions.push(...fallbackQuestions.slice(0, questionsPerGame - selectedQuestions.length));
    }
    // Ensure we have exactly the right number of questions
    return selectedQuestions.slice(0, questionsPerGame);
};
const createPost = async (context) => {
    const { reddit } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
        title: "Who Wants to Be a Redditionaire? - Test Your Knowledge!",
        subredditName: subreddit.name,
        preview: (Devvit.createElement("vstack", { height: "100%", width: "100%", alignment: "middle center" },
            Devvit.createElement("text", { size: "large" }, "Redditionaire Game Loading..."))),
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
        ui.showToast("Starting Redditionaire game - you'll be redirected to the game post!");
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
    height: "tall",
    render: (context) => {
        const [currentQuestion, setCurrentQuestion] = useState(0);
        const [score, setScore] = useState("$0");
        const [gameStatus, setGameStatus] = useState('waiting');
        const [fiftyFifty, setFiftyFifty] = useState(true);
        const [askAudience, setAskAudience] = useState(true);
        const [phoneFriend, setPhoneFriend] = useState(true);
        const [usedLifelines, setUsedLifelines] = useState([]);
        const [showWalkAway, setShowWalkAway] = useState(false);
        const [showLeaderboard, setShowLeaderboard] = useState(false);
        const [showHowToPlay, setShowHowToPlay] = useState(false);
        const [leaderboardData, setLeaderboardData] = useState([]);
        const [gameQuestions, setGameQuestions] = useState([]);
        const [lastAnswerExplanation, setLastAnswerExplanation] = useState("");
        const startGame = async () => {
            try {
                // Get current date and subreddit info for question rotation
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
                let subredditId = 'default';
                try {
                    const subreddit = await context.reddit.getCurrentSubreddit();
                    subredditId = subreddit.name;
                }
                catch (e) {
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
            }
            catch (error) {
                console.error('Error starting game:', error);
                // Fallback to fallback questions
                const fallbackQuestions = questionsData.rotationRules.fallbackQuestions.map(id => questionsData.questions.find(q => q.id === id)).filter(Boolean);
                setGameQuestions(fallbackQuestions);
                setGameStatus('playing');
            }
        };
        const answerQuestion = (selectedAnswer) => {
            if (gameQuestions.length === 0)
                return;
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
                }
                else {
                    // Check if it's a milestone question
                    const isMilestone = MONEY_LADDER[nextQuestion].milestone;
                    if (isMilestone) {
                        setShowWalkAway(true);
                    }
                    setCurrentQuestion(nextQuestion);
                    setScore(newScore);
                    setLastAnswerExplanation(""); // Clear explanation for next question
                }
            }
            else {
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
            setShowLeaderboard(false);
            setShowHowToPlay(false);
            setGameQuestions([]);
            setLastAnswerExplanation("");
        };
        const handleShowLeaderboard = () => {
            setLeaderboardData([
                { userId: "user1", score: 1000000 },
                { userId: "user2", score: 850000 },
                { userId: "user3", score: 600000 },
                { userId: "user4", score: 400000 },
                { userId: "user5", score: 250000 },
            ]);
            setShowLeaderboard(true);
            setShowHowToPlay(false);
        };
        const handleShowHowToPlay = () => {
            setShowHowToPlay(true);
            setShowLeaderboard(false);
        };
        const handleBackToStart = () => {
            setShowLeaderboard(false);
            setShowHowToPlay(false);
        };
        const renderMoneyLadder = () => (Devvit.createElement("vstack", { gap: "small", width: "100%" },
            Devvit.createElement("text", { size: "small", weight: "bold", alignment: "start" }, "Money Ladder"),
            Devvit.createElement("hstack", { gap: "small", width: "100%", alignment: "start" },
                Devvit.createElement("text", { size: "xsmall", color: "#90EE90" }, "E"),
                Devvit.createElement("text", { size: "xsmall", color: "#666666" }, "Easy"),
                Devvit.createElement("text", { size: "xsmall", color: "#FFD700" }, "M"),
                Devvit.createElement("text", { size: "xsmall", color: "#666666" }, "Medium"),
                Devvit.createElement("text", { size: "xsmall", color: "#FF6B6B" }, "H"),
                Devvit.createElement("text", { size: "xsmall", color: "#666666" }, "Hard")),
            Devvit.createElement("vstack", { gap: "small", width: "100%" }, MONEY_LADDER.map((rung, index) => {
                const questionDifficulty = gameQuestions[index]?.difficulty || "unknown";
                const difficultyColor = questionDifficulty === "easy" ? "#90EE90" :
                    questionDifficulty === "medium" ? "#FFD700" :
                        questionDifficulty === "hard" ? "#FF6B6B" : "#8B8B8B";
                return (Devvit.createElement("hstack", { key: index.toString(), width: "100%", padding: "xsmall", alignment: "start", gap: "small" },
                    Devvit.createElement("text", { size: "xsmall", width: "25px", weight: "bold", color: index === currentQuestion ? "#FFD700" :
                            index < currentQuestion ? "#90EE90" : "#8B8B8B" }, rung.question),
                    Devvit.createElement("text", { size: "xsmall", weight: rung.milestone ? "bold" : undefined, color: index === currentQuestion ? "#FFD700" :
                            index < currentQuestion ? "#90EE90" : "#8B8B8B" }, rung.amount),
                    rung.milestone && Devvit.createElement("text", { size: "xsmall", color: "blue" }, "\u2605"),
                    Devvit.createElement("text", { size: "xsmall", color: difficultyColor, width: "40px" }, questionDifficulty.charAt(0).toUpperCase())));
            }))));
        const renderLifelines = () => (Devvit.createElement("vstack", { gap: "small", width: "100%" },
            Devvit.createElement("text", { size: "small", weight: "bold", alignment: "center" }, "Lifelines"),
            Devvit.createElement("hstack", { gap: "small", width: "100%", alignment: "center" },
                Devvit.createElement("button", { appearance: fiftyFifty ? "primary" : "secondary", disabled: !fiftyFifty, onPress: () => useLifeline('fiftyFifty'), size: "small" }, "50:50"),
                Devvit.createElement("button", { appearance: askAudience ? "primary" : "secondary", disabled: !askAudience, onPress: () => useLifeline('askAudience'), size: "small" }, "Ask"),
                Devvit.createElement("button", { appearance: phoneFriend ? "primary" : "secondary", disabled: !phoneFriend, onPress: () => useLifeline('phoneFriend'), size: "small" }, "Call"))));
        const renderQuestion = () => {
            if (gameQuestions.length === 0) {
                return (Devvit.createElement("vstack", { gap: "medium", width: "100%", alignment: "center" },
                    Devvit.createElement("text", { size: "large", weight: "bold", alignment: "center" }, "Loading Questions...")));
            }
            const currentQ = gameQuestions[currentQuestion];
            return (Devvit.createElement("vstack", { gap: "medium", width: "100%" },
                Devvit.createElement("hstack", { gap: "small", width: "100%", alignment: "center" },
                    Devvit.createElement("text", { size: "large", weight: "bold" },
                        "Question ",
                        currentQ.id),
                    Devvit.createElement("text", { size: "small", color: "#666666" },
                        "(",
                        currentQ.category,
                        " \u2022 ",
                        currentQ.difficulty,
                        ")")),
                Devvit.createElement("text", { size: "medium", alignment: "center" }, currentQ.question),
                Devvit.createElement("vstack", { gap: "small", width: "100%" }, currentQ.options.map((option, index) => (Devvit.createElement("button", { key: index.toString(), appearance: "primary", onPress: () => answerQuestion(index), width: "100%", size: "small" },
                    String.fromCharCode(65 + index),
                    ". ",
                    option)))),
                lastAnswerExplanation && (Devvit.createElement("vstack", { gap: "small", width: "100%", padding: "small", backgroundColor: "#F0F8FF", cornerRadius: "small" },
                    Devvit.createElement("text", { size: "small", weight: "bold", color: "#0066CC" }, "Explanation:"),
                    Devvit.createElement("text", { size: "small", color: "#333333" }, lastAnswerExplanation)))));
        };
        const renderGameOver = () => (Devvit.createElement("vstack", { gap: "medium", width: "100%", alignment: "center" },
            Devvit.createElement("text", { size: "xlarge", weight: "bold" }, gameStatus === 'won' ? 'CONGRATULATIONS!' :
                gameStatus === 'lost' ? 'Game Over!' : 'Walked Away!'),
            Devvit.createElement("text", { size: "large" }, gameStatus === 'won' ? `You won $1,000,000!` :
                gameStatus === 'lost' ? `You lost at question ${currentQuestion + 1}` :
                    `You walked away with ${score}!`),
            lastAnswerExplanation && (Devvit.createElement("vstack", { gap: "small", width: "100%", padding: "small", backgroundColor: "#F0F8FF", cornerRadius: "small" },
                Devvit.createElement("text", { size: "small", weight: "bold", color: "#0066CC" }, "Final Answer Explanation:"),
                Devvit.createElement("text", { size: "small", color: "#333333" }, lastAnswerExplanation))),
            Devvit.createElement("button", { appearance: "primary", onPress: resetGame }, "Play Again")));
        const renderWalkAwayPrompt = () => (Devvit.createElement("vstack", { gap: "medium", width: "100%", alignment: "center" },
            Devvit.createElement("text", { size: "large", weight: "bold" }, "Milestone Reached!"),
            Devvit.createElement("text", { size: "medium" },
                "You've secured ",
                MONEY_LADDER[currentQuestion].amount,
                "!"),
            Devvit.createElement("text", { size: "small", color: "#666666" },
                "Question ",
                currentQuestion + 1,
                ": ",
                gameQuestions[currentQuestion]?.category,
                " \u2022 ",
                gameQuestions[currentQuestion]?.difficulty),
            Devvit.createElement("text", { size: "medium" }, "Do you want to continue or walk away?"),
            Devvit.createElement("hstack", { gap: "medium" },
                Devvit.createElement("button", { appearance: "primary", onPress: continueGame }, "Continue Playing"),
                Devvit.createElement("button", { appearance: "secondary", onPress: walkAway }, "Walk Away"))));
        const renderLeaderboard = () => (Devvit.createElement("vstack", { gap: "medium", width: "100%", height: "85%", alignment: "center", padding: "medium" },
            Devvit.createElement("text", { size: "xlarge", weight: "bold", alignment: "center" }, "Leaderboard"),
            Devvit.createElement("vstack", { gap: "small", width: "100%", maxHeight: "60%" }, leaderboardData.map((entry, index) => (Devvit.createElement("hstack", { key: entry.userId, width: "100%", padding: "small", backgroundColor: "#F8F8F8", cornerRadius: "small" },
                Devvit.createElement("text", { size: "medium", weight: "bold", width: "40px" },
                    "#",
                    index + 1),
                Devvit.createElement("text", { size: "medium", width: "60%" },
                    "Player ",
                    entry.userId),
                Devvit.createElement("text", { size: "medium", weight: "bold", color: "#FFD700" },
                    "$",
                    entry.score.toLocaleString()))))),
            Devvit.createElement("button", { appearance: "primary", onPress: handleBackToStart }, "Back to Start")));
        const renderHowToPlay = () => (Devvit.createElement("vstack", { gap: "medium", width: "100%", height: "85%", alignment: "center", padding: "medium" },
            Devvit.createElement("text", { size: "xlarge", weight: "bold", alignment: "center" }, "How to Play"),
            Devvit.createElement("vstack", { gap: "small", width: "100%", maxHeight: "60%" },
                Devvit.createElement("text", { size: "medium", weight: "bold" }, "Objective:"),
                Devvit.createElement("text", { size: "small" }, "Answer 12 questions correctly to win $1,000,000!"),
                Devvit.createElement("text", { size: "medium", weight: "bold" }, "Money Ladder:"),
                Devvit.createElement("text", { size: "small" }, "\u2022 Each correct answer moves you up the money ladder"),
                Devvit.createElement("text", { size: "small" }, "\u2022 Milestone questions (\u2605) let you walk away with guaranteed money"),
                Devvit.createElement("text", { size: "medium", weight: "bold" }, "Lifelines:"),
                Devvit.createElement("text", { size: "small" }, "\u2022 50:50 - Eliminates two wrong answers"),
                Devvit.createElement("text", { size: "small" }, "\u2022 Ask Audience - Shows audience poll results"),
                Devvit.createElement("text", { size: "small" }, "\u2022 Phone a Friend - Get a hint from a friend"),
                Devvit.createElement("text", { size: "medium", weight: "bold" }, "Game Over:"),
                Devvit.createElement("text", { size: "small" }, "\u2022 One wrong answer and you lose everything!"),
                Devvit.createElement("text", { size: "small" }, "\u2022 Use lifelines wisely to maximize your chances")),
            Devvit.createElement("button", { appearance: "primary", onPress: handleBackToStart }, "Back to Start")));
        return (Devvit.createElement("vstack", { height: "100%", width: "100%", gap: "medium" },
            Devvit.createElement("hstack", { width: "100%", padding: "small", backgroundColor: "#F0F0F0", cornerRadius: "small" },
                Devvit.createElement("text", { size: "medium", weight: "bold" }, "Redditionaire Game"),
                gameStatus === 'playing' && gameQuestions.length > 0 && (Devvit.createElement("vstack", { gap: "small", alignment: "end" },
                    Devvit.createElement("text", { size: "small", color: "#666666" },
                        "Question ",
                        currentQuestion + 1,
                        " of ",
                        gameQuestions.length),
                    Devvit.createElement("text", { size: "xsmall", color: "#999999" },
                        gameQuestions[currentQuestion]?.category,
                        " \u2022 ",
                        gameQuestions[currentQuestion]?.difficulty)))),
            gameStatus === 'waiting' && !showLeaderboard && !showHowToPlay && (Devvit.createElement("vstack", { gap: "medium", width: "100%", height: "85%", alignment: "center", padding: "medium" },
                Devvit.createElement("text", { size: "xlarge", weight: "bold", alignment: "center" }, "Who Wants to Be a Redditionaire?"),
                Devvit.createElement("text", { size: "large" }, "Test your knowledge with 12 questions and win up to $1,000,000!"),
                Devvit.createElement("text", { size: "small", color: "#666666" },
                    "Questions database: ",
                    questionsData.metadata.totalQuestions,
                    " questions available"),
                Devvit.createElement("text", { size: "small", color: "#666666" },
                    "Rotation: ",
                    questionsData.metadata.rotationMode,
                    " \u2022 Refresh: ",
                    questionsData.metadata.refreshWindow),
                Devvit.createElement("button", { appearance: "primary", onPress: startGame, size: "large", disabled: gameStatus !== 'waiting' }, gameStatus !== 'waiting' ? 'Game in Progress' : 'Start Game'),
                Devvit.createElement("hstack", { gap: "medium", width: "100%", alignment: "center" },
                    Devvit.createElement("button", { appearance: "secondary", onPress: handleShowLeaderboard, size: "medium" }, "Leaderboard"),
                    Devvit.createElement("button", { appearance: "secondary", onPress: handleShowHowToPlay, size: "medium" }, "How to Play")))),
            showLeaderboard && renderLeaderboard(),
            showHowToPlay && renderHowToPlay(),
            gameStatus === 'playing' && gameQuestions.length > 0 && (Devvit.createElement("hstack", { gap: "medium", width: "100%", height: "85%", padding: "medium" },
                Devvit.createElement("vstack", { width: "70%", height: "100%", gap: "small" },
                    renderQuestion(),
                    renderLifelines()),
                Devvit.createElement("vstack", { width: "30%", height: "100%" }, renderMoneyLadder()))),
            showWalkAway && renderWalkAwayPrompt(),
            (gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'walked') &&
                renderGameOver(),
            Devvit.createElement("hstack", { width: "100%", padding: "small", backgroundColor: "#F0F0F0", cornerRadius: "small" },
                Devvit.createElement("text", { size: "small", color: "#666666" }, "Redditionaire Game - Test Your Knowledge"),
                Devvit.createElement("text", { size: "xsmall", color: "#999999" },
                    "Updated: ",
                    questionsData.metadata.lastUpdated))));
    },
});
export default Devvit;
