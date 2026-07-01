import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  User, 
  Volume2, 
  VolumeX, 
  Timer, 
  Users, 
  PhoneCall, 
  Trash2, 
  RefreshCw, 
  HelpCircle, 
  RotateCcw, 
  ArrowLeft, 
  Trophy, 
  Compass, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  LogOut,
  Sparkles,
  Lock,
  Unlock
} from 'lucide-react';
import { Question, PlayerScore, GameState } from './types';
import { questions } from './questions';
import { soundManager } from './sound';

// Constants
const PRIZES = [
  100, 200, 300, 500, 1000,
  2000, 4000, 8000, 16000, 32000,
  64000, 125000, 250000, 500000, 1000000
];

const SAFE_HAVENS = [1000, 32000, 250000];

// Check if a level prize is a safe haven
const isSafeHaven = (prize: number) => SAFE_HAVENS.includes(prize);

// Simulated characters for "Call a Friend"
interface Friend {
  name: string;
  role: string;
  avatar: string;
  description: string;
  specialty: string;
}

const FRIENDS: Friend[] = [
  {
    name: "الوالد حمود",
    role: "راوي وخبير تراثي (78 عاماً)",
    avatar: "👴",
    description: "يمتلك معرفة واسعة جداً بالعادات والتقاليد، الأكلات الشعبية والأمثال العُمانية القديمة.",
    specialty: "العادات والتقاليد"
  },
  {
    name: "الأستاذة مريم البوسعيدية",
    role: "باحثة في التاريخ والآثار",
    avatar: "👩‍🏫",
    description: "متخصصة في تاريخ سلطنة عُمان، الأئمة، السلاطين، القلاع والحصون والمواقع التاريخية.",
    specialty: "التاريخ العُماني"
  },
  {
    name: "النواخذة سعيد السيابي",
    role: "بحّار متقاعد ومؤرخ ملاحي",
    avatar: "⚓",
    description: "خبير في الملاحة البحرية العُمانية، صناعة السفن التقليدية، والولايات الساحلية.",
    specialty: "البحار والملاحة العُمانية"
  }
];

export default function App() {
  // Game States
  const [gameState, setGameState] = useState<GameState>({
    playerName: '',
    currentLevel: 0,
    hasGameStarted: false,
    isGameOver: false,
    hasWonMillion: false,
    selectedAnswer: null,
    isAnswerSubmitted: false,
    timeRemaining: 60,
    lifelines: {
      callFriend: true,
      askAudience: true,
      fiftyFifty: true,
      changeQuestion: true
    },
    fiftyFiftyHidden: [],
    lifelineActive: null,
    friendResponse: null,
    audienceVotes: null,
    usedChangeQuestionThisTurn: false,
    prizeHistory: []
  });

  const [inputName, setInputName] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPrizeTreeMobile, setShowPrizeTreeMobile] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // Animation and simulation states
  const [isWaitingForReveal, setIsWaitingForReveal] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'safeHaven' | 'million' | null>(null);
  const [lifelineAnimation, setLifelineAnimation] = useState<'fiftyFifty' | 'changeQuestion' | 'askAudience' | 'callFriend' | null>(null);
  const [callProgress, setCallProgress] = useState<'idle' | 'calling' | 'connected'>('idle');
  const [transitionCountdown, setTransitionCountdown] = useState<number | null>(null);
  const [showLeaderboardClearConfirm, setShowLeaderboardClearConfirm] = useState(false);

  // Shuffled questions references
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [easyPool, setEasyPool] = useState<Question[]>([]);
  const [mediumPool, setMediumPool] = useState<Question[]>([]);
  const [hardPool, setHardPool] = useState<Question[]>([]);
  const [level13Pool, setLevel13Pool] = useState<Question[]>([]);
  const [level14Pool, setLevel14Pool] = useState<Question[]>([]);
  
  // Index of the next unused question in each pool
  const [poolIndices, setPoolIndices] = useState({ easy: 0, medium: 0, hard: 0, level13: 0, level14: 0 });

  // Timers
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load leaderboard and sound settings on mount
  useEffect(() => {
    const savedScores = localStorage.getItem('oman_heritage_millionaire_leaderboard');
    if (savedScores) {
      try {
        setLeaderboard(JSON.parse(savedScores));
      } catch (e) {
        console.error("Failed to parse leaderboard from localstorage", e);
      }
    }

    const savedSound = localStorage.getItem('oman_heritage_millionaire_sound');
    if (savedSound !== null) {
      const isEnabled = savedSound === 'true';
      setSoundEnabled(isEnabled);
      soundManager.enabled = isEnabled;
    }
  }, []);

  // Automatic transition countdown effect
  useEffect(() => {
    if (transitionCountdown === null) return;
    if (transitionCountdown <= 0) {
      setTransitionCountdown(null);
      handleNextQuestion();
      return;
    }

    const interval = setTimeout(() => {
      setTransitionCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(interval);
  }, [transitionCountdown]);

  // Update sound settings
  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    soundManager.enabled = newVal;
    localStorage.setItem('oman_heritage_millionaire_sound', String(newVal));
    if (newVal) {
      soundManager.playChime();
      if (gameState.hasGameStarted && !gameState.isGameOver) {
        soundManager.startBackgroundMusic();
      } else if (!gameState.hasGameStarted) {
        soundManager.playIntroTheme();
      }
    } else {
      soundManager.stopBackgroundMusic();
    }
  };

  // Mark a question as recently used
  const markQuestionAsRecent = (questionId: number) => {
    try {
      const stored = localStorage.getItem('oman_heritage_recent_questions');
      let recents: number[] = stored ? JSON.parse(stored).map(Number) : [];
      if (!recents.includes(questionId)) {
        recents.push(questionId);
        // Keep list reasonable so we don't block all questions completely but prevent repeats for up to 20 attempts
        if (recents.length > 95) {
          recents.shift();
        }
        localStorage.setItem('oman_heritage_recent_questions', JSON.stringify(recents));
      }
    } catch (e) {
      console.error('Error saving recent question ID:', e);
    }
  };

  // Setup/Reset game questions
  const initGamePools = () => {
    // Load recently used question IDs from localStorage
    let recentIds: number[] = [];
    try {
      const stored = localStorage.getItem('oman_heritage_recent_questions');
      if (stored) {
        recentIds = JSON.parse(stored).map(Number);
      }
    } catch (e) {
      recentIds = [];
    }

    // Helper to filter out recent questions but ensure we have enough left
    const filterAndEnsureCount = (allQuestions: Question[], minNeeded: number) => {
      let filtered = allQuestions.filter(q => !recentIds.includes(q.id));
      let tempRecent = [...recentIds];
      // If we don't have enough unused questions, progressively discard the oldest recent IDs
      while (filtered.length < minNeeded && tempRecent.length > 0) {
        tempRecent.shift(); // remove oldest
        const remainingRecents = tempRecent;
        filtered = allQuestions.filter(q => !remainingRecents.includes(q.id));
      }
      
      // Update localStorage if we shrank the recent list
      if (tempRecent.length !== recentIds.length) {
        try {
          localStorage.setItem('oman_heritage_recent_questions', JSON.stringify(tempRecent));
        } catch (e) {}
      }
      return filtered;
    };

    // Filter questions by difficulty while avoiding recently played questions
    const easyBase = questions.filter(q => q.difficulty === 'easy');
    const mediumBase = questions.filter(q => q.difficulty === 'medium');
    const hardBase = questions.filter(q => q.difficulty === 'hard' && q.specialLevel === undefined);
    const lvl13Base = questions.filter(q => q.specialLevel === 13);
    const lvl14Base = questions.filter(q => q.specialLevel === 14);

    const easy = filterAndEnsureCount(easyBase, 10);
    const medium = filterAndEnsureCount(mediumBase, 10);
    const hard = filterAndEnsureCount(hardBase, 10);
    const level13 = filterAndEnsureCount(lvl13Base, 3);
    const level14 = filterAndEnsureCount(lvl14Base, 3);

    // Shuffle helper
    const shuffleArray = <T,>(arr: T[]): T[] => {
      const newArr = [...arr];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      return newArr;
    };

    const shuffledEasy = shuffleArray(easy);
    const shuffledMedium = shuffleArray(medium);
    const shuffledHard = shuffleArray(hard);
    const shuffledLevel13 = shuffleArray(level13);
    const shuffledLevel14 = shuffleArray(level14);

    setEasyPool(shuffledEasy);
    setMediumPool(shuffledMedium);
    setHardPool(shuffledHard);
    setLevel13Pool(shuffledLevel13);
    setLevel14Pool(shuffledLevel14);
    setPoolIndices({ easy: 0, medium: 0, hard: 0, level13: 0, level14: 0 });

    return {
      easy: shuffledEasy,
      medium: shuffledMedium,
      hard: shuffledHard,
      level13: shuffledLevel13,
      level14: shuffledLevel14
    };
  };

  // Select appropriate question based on level
  const selectQuestionForLevel = (
    level: number, 
    pools: { easy: Question[], medium: Question[], hard: Question[], level13: Question[], level14: Question[] },
    indices: { easy: number, medium: number, hard: number, level13: number, level14: number }
  ) => {
    let question: Question;
    let newIndices = { ...indices };

    if (level < 5) {
      // Easy question for Level 1 to 5
      question = pools.easy[indices.easy];
      newIndices.easy += 1;
    } else if (level < 10) {
      // Medium question for Level 6 to 10
      question = pools.medium[indices.medium];
      newIndices.medium += 1;
    } else if (level === 13) {
      // Special Level 13 (500k OMR)
      question = pools.level13[indices.level13] || pools.hard[indices.hard];
      if (pools.level13[indices.level13]) {
        newIndices.level13 += 1;
      } else {
        newIndices.hard += 1;
      }
    } else if (level === 14) {
      // Special Level 14 (1M OMR)
      question = pools.level14[indices.level14] || pools.hard[indices.hard];
      if (pools.level14[indices.level14]) {
        newIndices.level14 += 1;
      } else {
        newIndices.hard += 1;
      }
    } else {
      // Hard question for Levels 11, 12
      question = pools.hard[indices.hard];
      newIndices.hard += 1;
    }

    if (question && question.id) {
      markQuestionAsRecent(question.id);
    }

    setPoolIndices(newIndices);
    setCurrentQuestion(question);
    return question;
  };

  // Start the Game
  const startGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;

    soundManager.playChime();

    const pools = initGamePools();
    const firstQuestion = selectQuestionForLevel(0, pools, { easy: 0, medium: 0, hard: 0, level13: 0, level14: 0 });

    setGameState({
      playerName: inputName,
      currentLevel: 0,
      hasGameStarted: true,
      isGameOver: false,
      hasWonMillion: false,
      selectedAnswer: null,
      isAnswerSubmitted: false,
      timeRemaining: 60,
      lifelines: {
        callFriend: true,
        askAudience: true,
        fiftyFifty: true,
        changeQuestion: true
      },
      fiftyFiftyHidden: [],
      lifelineActive: null,
      friendResponse: null,
      audienceVotes: null,
      usedChangeQuestionThisTurn: false,
      prizeHistory: []
    });

    // Start timer
    startCountdownTimer();
    soundManager.startBackgroundMusic();
  };

  // Timer Management
  const startCountdownTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setGameState(prev => ({ ...prev, timeRemaining: 60 }));
    
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timeRemaining <= 1) {
          clearInterval(timerRef.current!);
          soundManager.playWrong();
          handleGameOver(prev.currentLevel, true); // Time out
          return { ...prev, timeRemaining: 0 };
        }
        
        // Play ticking sound in last 10 seconds or every 5 seconds normally
        if (prev.timeRemaining <= 10 || prev.timeRemaining % 3 === 0) {
          soundManager.playTick();
        }
        
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Select Option
  const handleSelectOption = (option: 'A' | 'B' | 'C' | 'D') => {
    if (gameState.isAnswerSubmitted || gameState.isGameOver) return;
    setGameState(prev => ({ ...prev, selectedAnswer: option }));
    soundManager.playTick();
  };

  // Submit Answer
  const handleSubmitAnswer = () => {
    if (!gameState.selectedAnswer || gameState.isAnswerSubmitted || isWaitingForReveal) return;

    stopTimer();
    setIsWaitingForReveal(true);
    soundManager.playTensionWaiting();

    setTimeout(() => {
      setIsWaitingForReveal(false);
      const isCorrect = gameState.selectedAnswer === currentQuestion?.correctAnswer;
      setGameState(prev => ({ ...prev, isAnswerSubmitted: true }));

      if (isCorrect) {
        soundManager.playCorrect();
        
        // Trigger celebratory effects on reaching safe havens (Level indexes 4, 9, 12 completed)
        const currentLvl = gameState.currentLevel;
        if (currentLvl === 4 || currentLvl === 9 || currentLvl === 12) {
          setCelebrationType('safeHaven');
          setShowCelebration(true);
          setTimeout(() => {
            setShowCelebration(prevShow => {
              if (prevShow) {
                setTransitionCountdown(5);
              }
              return false;
            });
            setCelebrationType(null);
          }, 4500);
        } else {
          // Start 5 seconds countdown to transition to the next question automatically
          setTransitionCountdown(5);
        }
      } else {
        soundManager.playWrong();
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
        }, 800);
      }
    }, 2000);
  };

  // Move to Next Question or finish
  const handleNextQuestion = () => {
    setTransitionCountdown(null);
    const isLastLevel = gameState.currentLevel === 14;

    if (isLastLevel) {
      // Won the Million!
      soundManager.stopBackgroundMusic();
      soundManager.playFanfare();
      saveHighScore(gameState.playerName, 1000000, 15);
      setGameState(prev => ({
        ...prev,
        isGameOver: true,
        hasWonMillion: true
      }));
      setCelebrationType('million');
      setShowCelebration(true);
    } else {
      // Advance to next level
      const nextLvl = gameState.currentLevel + 1;
      const pools = { easy: easyPool, medium: mediumPool, hard: hardPool, level13: level13Pool, level14: level14Pool };
      selectQuestionForLevel(nextLvl, pools, poolIndices);

      setGameState(prev => ({
        ...prev,
        currentLevel: nextLvl,
        selectedAnswer: null,
        isAnswerSubmitted: false,
        timeRemaining: 60,
        fiftyFiftyHidden: [],
        lifelineActive: null,
        friendResponse: null,
        audienceVotes: null,
        usedChangeQuestionThisTurn: false
      }));

      startCountdownTimer();
    }
  };

  // Handle Game Over
  const handleGameOver = (completedCount: number, isTimeout: boolean = false) => {
    stopTimer();
    soundManager.stopBackgroundMusic();
    
    // Get prize based on safe havens passed
    const prize = getWalkawayPrize(completedCount);
    saveHighScore(gameState.playerName, prize, completedCount);

    setGameState(prev => ({
      ...prev,
      isGameOver: true,
      timeRemaining: isTimeout ? 0 : prev.timeRemaining
    }));
  };

  // Calculate prize if player gets a wrong answer
  const getWalkawayPrize = (levelIndex: number): number => {
    // If they got wrong on current level, the number of successfully answered questions is equal to the current level index
    // e.g. levelIndex = 0 (trying Q1) -> got wrong -> successfully answered = 0
    // levelIndex = 5 (trying Q6) -> got wrong -> successfully answered = 5 (up to Q5) -> gets Safe Haven of 1,000 OMR
    const completedCount = levelIndex;
    if (completedCount >= 13) return 250000; // Passed level 13 (Q13) -> 250,000 OMR
    if (completedCount >= 10) return 32000;   // Passed level 10 (Q10) -> 32,000 OMR
    if (completedCount >= 5) return 1000;     // Passed level 5 (Q5) -> 1,000 OMR
    return 0;
  };

  // Handle Withdrawal (الانسحاب)
  const handleWithdraw = () => {
    if (gameState.isGameOver || !gameState.hasGameStarted) return;
    
    stopTimer();
    soundManager.stopBackgroundMusic();
    soundManager.playChime();
    
    // They get the prize of the PREVIOUS level they answered correctly
    const completedCount = gameState.currentLevel;
    const prize = completedCount > 0 ? PRIZES[completedCount - 1] : 0;
    
    saveHighScore(gameState.playerName, prize, completedCount);
    
    setGameState(prev => ({
      ...prev,
      isGameOver: true
    }));
  };

  // Save High Score to localstorage
  const saveHighScore = (name: string, prize: number, correctAnswers: number) => {
    const newScore: PlayerScore = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      prizeWon: prize,
      correctAnswersCount: correctAnswers,
      date: new Date().toLocaleDateString('ar-OM', { year: 'numeric', month: 'long', day: 'numeric' })
    };

    setLeaderboard(prev => {
      const updated = [newScore, ...prev]
        .sort((a, b) => b.prizeWon - a.prizeWon || b.correctAnswersCount - a.correctAnswersCount)
        .slice(0, 10); // keep top 10

      localStorage.setItem('oman_heritage_millionaire_leaderboard', JSON.stringify(updated));
      return updated;
    });
  };

  // Clear Leaderboard
  const handleClearLeaderboard = () => {
    localStorage.removeItem('oman_heritage_millionaire_leaderboard');
    setLeaderboard([]);
    soundManager.playWrong();
    setShowLeaderboardClearConfirm(false);
  };

  // ==================== LIFELINES IMPLEMENTATION ====================

  // 1. 50/50 (حذف إجابتين)
  const useFiftyFifty = () => {
    if (!gameState.lifelines.fiftyFifty || gameState.isAnswerSubmitted || gameState.isGameOver) return;
    if (!currentQuestion) return;

    soundManager.playChime();
    setLifelineAnimation('fiftyFifty');

    const correct = currentQuestion.correctAnswer;
    const options: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    
    // Shuffled incorrect options
    const incorrectOptions = options.filter(o => o !== correct);
    const shuffledIncorrect = [...incorrectOptions].sort(() => Math.random() - 0.5);
    
    // Pick 2 to hide
    const toHide = [shuffledIncorrect[0], shuffledIncorrect[1]];

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        lifelines: {
          ...prev.lifelines,
          fiftyFifty: false
        },
        fiftyFiftyHidden: toHide
      }));
      setLifelineAnimation(null);
    }, 800);
  };

  // 2. Change Question (تغيير السؤال)
  const useChangeQuestion = () => {
    if (!gameState.lifelines.changeQuestion || gameState.isAnswerSubmitted || gameState.isGameOver) return;

    soundManager.playChime();
    setLifelineAnimation('changeQuestion');

    setTimeout(() => {
      const level = gameState.currentLevel;
      const pools = { easy: easyPool, medium: mediumPool, hard: hardPool, level13: level13Pool, level14: level14Pool };
      
      // We grab the next question from the pool
      let nextIndex = { ...poolIndices };
      let question: Question;

      if (level < 5) {
        question = pools.easy[nextIndex.easy];
        nextIndex.easy += 1;
      } else if (level < 10) {
        question = pools.medium[nextIndex.medium];
        nextIndex.medium += 1;
      } else if (level === 13) {
        question = pools.level13[nextIndex.level13] || pools.hard[nextIndex.hard];
        if (pools.level13[nextIndex.level13]) {
          nextIndex.level13 += 1;
        } else {
          nextIndex.hard += 1;
        }
      } else if (level === 14) {
        question = pools.level14[nextIndex.level14] || pools.hard[nextIndex.hard];
        if (pools.level14[nextIndex.level14]) {
          nextIndex.level14 += 1;
        } else {
          nextIndex.hard += 1;
        }
      } else {
        question = pools.hard[nextIndex.hard];
        nextIndex.hard += 1;
      }

      if (question && question.id) {
        markQuestionAsRecent(question.id);
      }

      setPoolIndices(nextIndex);
      setCurrentQuestion(question);

      setGameState(prev => ({
        ...prev,
        lifelines: {
          ...prev.lifelines,
          changeQuestion: false
        },
        selectedAnswer: null,
        fiftyFiftyHidden: [],
        lifelineActive: null,
        friendResponse: null,
        audienceVotes: null
      }));

      // Restart timer
      startCountdownTimer();
      setLifelineAnimation(null);
    }, 1000); // 1 second rotatory circular transition
  };

  // 3. Ask the Audience (سؤال الجمهور)
  const useAskAudience = () => {
    if (!gameState.lifelines.askAudience || gameState.isAnswerSubmitted || gameState.isGameOver) return;
    if (!currentQuestion) return;

    soundManager.playChime();

    const correct = currentQuestion.correctAnswer;
    let votes = { A: 0, B: 0, C: 0, D: 0 };
    
    // Filter out options that were already hidden by 50/50
    const visibleOptions = (['A', 'B', 'C', 'D'] as const).filter(
      opt => !gameState.fiftyFiftyHidden.includes(opt)
    );

    // Confidence of correct answer depends on difficulty
    let correctWeight = 40; // Hard default
    if (currentQuestion.difficulty === 'easy') {
      correctWeight = 75;
    } else if (currentQuestion.difficulty === 'medium') {
      correctWeight = 55;
    }

    // Allocate votes
    let remaining = 100;
    
    // Give correct answer its shares
    const correctShare = Math.round(correctWeight + Math.random() * 10);
    votes[correct] = correctShare;
    remaining -= correctShare;

    // Distribute remaining among other visible options
    const remainingIncorrect = visibleOptions.filter(o => o !== correct);
    if (remainingIncorrect.length > 0) {
      remainingIncorrect.forEach((opt, idx) => {
        if (idx === remainingIncorrect.length - 1) {
          votes[opt] = remaining;
        } else {
          const share = Math.round(Math.random() * remaining);
          votes[opt] = share;
          remaining -= share;
        }
      });
    }

    setGameState(prev => ({
      ...prev,
      lifelines: {
        ...prev.lifelines,
        askAudience: false
      },
      lifelineActive: 'askAudience',
      audienceVotes: votes
    }));
  };

  // 4. Call a Friend (الاتصال بصديق)
  const handleSelectFriend = (friend: Friend) => {
    if (!currentQuestion) return;
    
    setSelectedFriend(friend);
    setCallProgress('calling');
    soundManager.playLifelineCall();

    const correct = currentQuestion.correctAnswer;
    const isSpecialty = currentQuestion.category === friend.specialty;
    
    // Percentage chance of knowing the answer
    let chance = 50; // hard or unrelated default
    if (isSpecialty) {
      chance = 90; // Specialty has high accuracy
    } else if (currentQuestion.difficulty === 'easy') {
      chance = 80;
    } else if (currentQuestion.difficulty === 'medium') {
      chance = 65;
    }

    const knowsAnswer = Math.random() * 100 <= chance;
    let answerResponse = "";

    // Options that are visible
    const visibleOptions = (['A', 'B', 'C', 'D'] as const).filter(
      opt => !gameState.fiftyFiftyHidden.includes(opt)
    );

    const suggestedAnswer = knowsAnswer 
      ? correct 
      : (visibleOptions.find(o => o !== correct) || correct);

    const arabicOptions: Record<string, string> = {
      A: "أ", B: "ب", C: "ج", D: "د"
    };

    const choiceText = currentQuestion.options[suggestedAnswer];

    if (isSpecialty) {
      answerResponse = `يا بطل، هذا مجالي! سأقول وبكل ثقة أن الإجابة الصحيحة هي: [${arabicOptions[suggestedAnswer]}] - "${choiceText}". أنا متأكد بنسبة ${chance}% لأن هذا من ركائز تراثنا الأصيل!`;
    } else if (knowsAnswer) {
      answerResponse = `أهلاً بك يا بطل! سؤال رائع. بعد التفكير السريع، يبدو لي أن الإجابة الأقرب للصواب هي: [${arabicOptions[suggestedAnswer]}] - "${choiceText}". ثقتي تبلغ حوالي ${chance}%.`;
    } else {
      answerResponse = `مرحباً! الصراحة هذا سؤال دقيق ومحير. لست واثقاً تماماً، لكن حدسي يميل للخيار: [${arabicOptions[suggestedAnswer]}] - "${choiceText}". قد تكون نسبة ثقتي ${chance}%، يفضل أن تعتمد على تفكيرك أيضاً!`;
    }

    // Delay for 2.4s to simulate calling before connecting the call
    setTimeout(() => {
      setCallProgress('connected');
      setGameState(prev => ({
        ...prev,
        lifelines: {
          ...prev.lifelines,
          callFriend: false
        },
        lifelineActive: 'callFriend',
        friendResponse: answerResponse
      }));
    }, 2400);
  };

  // Close active lifeline displays
  const closeLifelineActive = () => {
    setGameState(prev => ({ ...prev, lifelineActive: null }));
    setSelectedFriend(null);
  };

  // Return to Home Screen
  const resetToHome = () => {
    stopTimer();
    setInputName('');
    setGameState(prev => ({
      ...prev,
      hasGameStarted: false,
      isGameOver: false,
      playerName: ''
    }));
  };

  // Play Again
  const playAgain = () => {
    const pools = initGamePools();
    const firstQuestion = selectQuestionForLevel(0, pools, { easy: 0, medium: 0, hard: 0, level13: 0, level14: 0 });

    setGameState({
      playerName: gameState.playerName,
      currentLevel: 0,
      hasGameStarted: true,
      isGameOver: false,
      hasWonMillion: false,
      selectedAnswer: null,
      isAnswerSubmitted: false,
      timeRemaining: 60,
      lifelines: {
        callFriend: true,
        askAudience: true,
        fiftyFifty: true,
        changeQuestion: true
      },
      fiftyFiftyHidden: [],
      lifelineActive: null,
      friendResponse: null,
      audienceVotes: null,
      usedChangeQuestionThisTurn: false,
      prizeHistory: []
    });

    startCountdownTimer();
    soundManager.startBackgroundMusic();
  };

  return (
    <div 
      className={`min-h-screen relative flex flex-col justify-between overflow-x-hidden bg-slate-950 select-none ${isShaking ? 'shake-element' : ''}`}
    >
      {/* 3D Studio Background and Moving Spotlight Lights */}
      <div className="studio-3d-bg">
        <div className="studio-grid-3d" />
        {/* Dynamic spot lighting */}
        <div className="spotlight-left" />
        <div className="spotlight-right" />
      </div>
      {/* Immersive Dot Grid Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none dot-grid" />

      {/* Decorative Traditional Omani Corner Patterns */}
      <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 border-t-4 border-r-4 border-oman-gold/30 rounded-tr-3xl opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-32 h-32 md:w-48 md:h-48 border-t-4 border-l-4 border-oman-gold/30 rounded-tl-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 md:w-48 md:h-48 border-b-4 border-r-4 border-oman-gold/30 rounded-br-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 md:w-48 md:h-48 border-b-4 border-l-4 border-oman-gold/30 rounded-bl-3xl opacity-20 pointer-events-none" />

      {/* Header Bar */}
      <header className="blue-glass px-4 py-3 md:px-8 flex justify-between items-center z-10 border-b border-oman-gold/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-500 to-yellow-400 p-1.5 rounded-full shadow-inner border border-oman-gold/30">
            <Trophy className="w-5 h-5 text-oman-dark" />
          </div>
          <div>
            <h1 className="font-serif text-lg md:text-xl font-bold text-oman-gold-light tracking-tight gold-glow">
              كنز التراث العُماني
            </h1>
            <p className="text-[10px] md:text-xs text-slate-300 font-sans">
              مسابقة من سيربح المليون التراثية
            </p>
          </div>
        </div>

        {/* Institutional Affiliation & Global Controls */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end text-right border-r border-oman-gold/20 pr-4 pl-1">
            <span className="text-[10px] md:text-xs font-bold text-oman-gold-light tracking-wide font-sans">
              المديرية العامة للتعليم بمحافظة الوسطى
            </span>
            <span className="text-[9px] md:text-[10px] text-slate-300 font-sans">
              مركز اللكبي الصيفي ( صيفي تعلم وابتكار)
            </span>
          </div>

          <div className="h-6 w-px bg-oman-gold/20 hidden md:block" />

          <div className="flex items-center gap-2">
            <button 
              id="sound-toggle-btn"
              onClick={toggleSound}
              className="p-2 rounded-lg bg-oman-blue/80 border border-oman-gold/30 text-oman-gold hover:bg-oman-gold/20 hover:text-white transition-all shadow-md"
              title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
            
            {gameState.hasGameStarted && !gameState.isGameOver && (
              <button 
                id="withdraw-header-btn"
                onClick={handleWithdraw}
                className="px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-500/40 text-red-200 text-xs md:text-sm font-semibold hover:bg-red-900 transition-all flex items-center gap-1 shadow-md"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>انسحاب</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col justify-center items-center z-10">
        
        {/* ==================== SCREEN 1: START SCREEN ==================== */}
        {!gameState.hasGameStarted && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl blue-glass rounded-2xl p-6 md:p-8 text-center gold-border relative overflow-hidden shadow-2xl"
          >
            {/* Omani Emblem Overlay Icon */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-5 pointer-events-none">
              <Compass className="w-72 h-72 text-oman-gold" />
            </div>

            {/* Institutional Header Banner */}
            <div className="flex flex-col items-center mb-6 space-y-1 bg-oman-gold/5 border border-oman-gold/10 rounded-xl py-3 px-4 max-w-md mx-auto relative z-10 shadow-sm">
              <span className="text-xs md:text-sm font-extrabold text-oman-gold-light tracking-wide font-sans">
                المديرية العامة للتعليم بمحافظة الوسطى
              </span>
              <div className="h-[1px] w-24 bg-oman-gold/25" />
              <span className="text-[11px] md:text-xs text-slate-300 font-medium">
                مركز اللكبي الصيفي ( صيفي تعلم وابتكار)
              </span>
            </div>

            {/* Glowing Golden Title Logo */}
            <div className="relative mb-6 flex flex-col items-center">
              <motion.div 
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                className="w-24 h-24 md:w-28 md:h-28 flex items-center justify-center border-2 border-oman-gold bg-oman-dark rounded-full mb-3 shadow-lg relative"
              >
                {/* Simulated Omani Khanjar Golden Vector drawing inside SVG */}
                <svg className="w-16 h-16 text-oman-gold" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A3,3 0 0,0 9,5C9,6.05 9.54,7 10.38,7.56L9.12,14.65C9,15.34 9.5,16 10.2,16H13.8C14.5,16 15,15.34 14.88,14.65L13.62,7.56C14.46,7 15,6.05 15,5A3,3 0 0,0 12,2M12,4A1,1 0 0,1 13,5A1,1 0 0,1 12,6A1,1 0 0,1 11,5A1,1 0 0,1 12,4M10,18V20H14V18H10M8,21V22H16V21H8Z" />
                </svg>
                <div className="absolute inset-0 rounded-full border border-oman-gold animate-ping opacity-10" />
              </motion.div>

              <h2 className="font-serif text-2xl md:text-4xl font-extrabold text-oman-gold tracking-wider mb-2 gold-glow">
                مَنْ سَيَرْبَحُ المِلْيُونَ التُرَاثِي
              </h2>
              <div className="h-[2px] w-48 bg-gradient-to-r from-transparent via-oman-gold to-transparent mb-2" />
              <p className="font-serif text-lg md:text-xl text-oman-gold-light italic">
                كَنْزُ التُّرَاثِ العُمَانِيّ
              </p>
            </div>

            {/* Start Game Form */}
            <form onSubmit={startGame} className="max-w-md mx-auto space-y-4 mb-8">
              <div className="text-right">
                <label className="block text-sm text-slate-300 font-semibold mb-1 mr-1">اسم المتسابق الكريم:</label>
                <div className="relative">
                  <User className="absolute right-3 top-3 w-5 h-5 text-oman-gold/60" />
                  <input 
                    id="player-name-input"
                    type="text" 
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="أدخل اسمك الكريم هنا..."
                    maxLength={25}
                    className="w-full pl-4 pr-11 py-3 bg-oman-dark/90 border border-oman-gold/30 rounded-xl text-center text-white placeholder-slate-500 focus:outline-none focus:border-oman-gold focus:ring-1 focus:ring-oman-gold shadow-inner transition-all text-base font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  id="start-game-btn"
                  type="submit"
                  className="w-full py-3 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-oman-dark font-extrabold text-base rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5 border border-amber-300/30 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>ابدأ اللعبة</span>
                </button>

                <button 
                  id="instructions-btn"
                  type="button"
                  onClick={() => { soundManager.playChime(); setShowInstructions(true); }}
                  className="w-full py-3 bg-oman-blue/80 border border-oman-gold/40 text-oman-gold hover:bg-oman-gold/10 font-bold text-base rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>التعليمات</span>
                </button>
              </div>
            </form>

            {/* Quick Leaderboard Preview */}
            <div className="text-right border-t border-oman-gold/20 pt-6">
              {!isAdminUnlocked ? (
                <div className="flex flex-col items-center justify-center p-5 bg-oman-blue/30 border border-oman-gold/20 rounded-xl relative overflow-hidden">
                  <Lock className="w-8 h-8 text-oman-gold mb-2 animate-pulse" />
                  <h3 className="font-serif text-base font-bold text-oman-gold-light mb-1">
                    قائمة المتسابقين محمية بقفل
                  </h3>
                  <p className="text-xs text-slate-300 mb-4 text-center max-w-sm leading-relaxed">
                    لرؤية لوحة المتصدرين وأبطال التراث، يرجى إدخال الرقم السري الخاص بالمسؤول.
                  </p>

                  {!showPasswordInput ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playChime();
                        setShowPasswordInput(true);
                        setShowPasswordError(false);
                      }}
                      className="px-4 py-2 bg-oman-gold/10 hover:bg-oman-gold/20 border border-oman-gold/40 text-oman-gold font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>إدخال الرقم السري</span>
                    </button>
                  ) : (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (adminPasswordInput.trim() === 'admin') {
                          setIsAdminUnlocked(true);
                          setShowPasswordInput(false);
                          setShowPasswordError(false);
                          setAdminPasswordInput('');
                          soundManager.playChime();
                        } else {
                          setShowPasswordError(true);
                          soundManager.playWrong();
                        }
                      }}
                      className="w-full max-w-xs space-y-3"
                    >
                      <div className="relative">
                        <input
                          type="password"
                          value={adminPasswordInput}
                          onChange={(e) => setAdminPasswordInput(e.target.value)}
                          placeholder="أدخل الرقم السري للمسؤول..."
                          className="w-full text-center px-3 py-2 bg-oman-dark border border-oman-gold/40 rounded-lg text-white text-xs focus:outline-none focus:border-oman-gold transition-all"
                          autoFocus
                          required
                        />
                      </div>
                      {showPasswordError && (
                        <p className="text-[11px] text-red-400 text-center font-bold">
                          ⚠️ الرقم السري غير صحيح! حاول مرة أخرى.
                        </p>
                      )}
                      <div className="flex gap-2 justify-center">
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-gradient-to-b from-amber-500 to-amber-600 text-oman-dark font-bold text-xs rounded-lg hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer active:scale-95"
                        >
                          تأكيد
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordInput(false);
                            setShowPasswordError(false);
                            setAdminPasswordInput('');
                          }}
                          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition-all cursor-pointer active:scale-95"
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4 bg-oman-gold/5 p-2 rounded-lg border border-oman-gold/10">
                    <div className="flex gap-2">
                      {leaderboard.length > 0 && (
                        <button 
                          id="clear-leaderboard-btn"
                          onClick={() => setShowLeaderboardClearConfirm(true)}
                          className="text-xs text-red-400 hover:text-red-300 transition-all bg-red-950/20 hover:bg-red-950/40 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1 cursor-pointer"
                        >
                          <span>🗑️</span>
                          <span>مسح السجل</span>
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setIsAdminUnlocked(false);
                          soundManager.playChime();
                        }}
                        className="text-xs text-slate-300 hover:text-white transition-all bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-oman-gold" />
                        <span>قفل القائمة</span>
                      </button>
                    </div>
                    <h3 className="font-serif text-base font-bold text-oman-gold flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      <span>لوحة المتصدرين وأبطال التراث</span>
                    </h3>
                  </div>

                  {leaderboard.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 italic">
                      لا يوجد سجل متسابقين حالياً. كن أول من يربح المليون ويرسخ اسمه هنا!
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-48 overflow-y-auto pr-1">
                      <table className="w-full text-xs text-slate-300 text-right">
                        <thead>
                          <tr className="border-b border-oman-gold/20 text-oman-gold-light text-[11px] uppercase">
                            <th className="py-2 font-bold">الترتيب</th>
                            <th className="py-2 font-bold">المتسابق</th>
                            <th className="py-2 text-center font-bold">الإجابات</th>
                            <th className="py-2 text-left font-bold">الجائزة المستحقة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((item, idx) => (
                            <tr 
                              key={item.id} 
                              className={`border-b border-oman-gold/5 hover:bg-oman-gold/5 transition-colors ${idx === 0 ? 'bg-amber-500/5 text-amber-200 font-semibold' : ''}`}
                            >
                              <td className="py-2 font-mono">{idx + 1}#</td>
                              <td className="py-2 font-bold max-w-[120px] truncate">{item.name}</td>
                              <td className="py-2 text-center font-mono">{item.correctAnswersCount} / 15</td>
                              <td className="py-2 text-left font-bold text-oman-gold font-mono">
                                {item.prizeWon.toLocaleString('ar-OM')} ريال
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ==================== SCREEN 2: ACTIVE GAME PLAY ==================== */}
        {gameState.hasGameStarted && !gameState.isGameOver && currentQuestion && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
            
            {/* LEFT 3 COLUMNS: QUESTION BOARD & LIFELINES */}
            <div className="lg:col-span-3 flex flex-col justify-between gap-6">
              
              {/* Game Stats Bar & Active Lifelines */}
              <div className="blue-glass rounded-xl p-4 gold-border flex flex-wrap gap-4 justify-between items-center shadow-md">
                
                {/* Lifeline Buttons Panel */}
                <div className="flex items-center gap-2 md:gap-3">
                  {/* 50/50 */}
                  <button 
                    id="lifeline-fifty-fifty"
                    onClick={useFiftyFifty}
                    disabled={!gameState.lifelines.fiftyFifty || gameState.isAnswerSubmitted}
                    className={`p-2.5 md:p-3 rounded-full border transition-all shadow-md relative group cursor-pointer ${
                      gameState.lifelines.fiftyFifty && !gameState.isAnswerSubmitted
                        ? 'bg-oman-blue border-oman-gold text-oman-gold hover:bg-oman-gold hover:text-oman-dark hover:scale-105' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed line-through'
                    }`}
                    title="حذف إجابتين (50/50)"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="absolute -top-1 -right-1 text-[8px] bg-oman-gold text-oman-dark px-1.5 py-0.5 rounded-full font-bold">50:50</span>
                  </button>

                  {/* Ask Audience */}
                  <button 
                    id="lifeline-ask-audience"
                    onClick={useAskAudience}
                    disabled={!gameState.lifelines.askAudience || gameState.isAnswerSubmitted}
                    className={`p-2.5 md:p-3 rounded-full border transition-all shadow-md relative group cursor-pointer ${
                      gameState.lifelines.askAudience && !gameState.isAnswerSubmitted
                        ? 'bg-oman-blue border-oman-gold text-oman-gold hover:bg-oman-gold hover:text-oman-dark hover:scale-105' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed line-through'
                    }`}
                    title="سؤال الجمهور"
                  >
                    <Users className="w-4 h-4 md:w-5 md:h-5" />
                  </button>

                  {/* Call Friend */}
                  <button 
                    id="lifeline-call-friend"
                    onClick={() => {
                      if (!gameState.lifelines.callFriend || gameState.isAnswerSubmitted) return;
                      soundManager.playChime();
                      setGameState(prev => ({ ...prev, lifelineActive: 'callFriend' }));
                    }}
                    disabled={!gameState.lifelines.callFriend || gameState.isAnswerSubmitted}
                    className={`p-2.5 md:p-3 rounded-full border transition-all shadow-md relative group cursor-pointer ${
                      gameState.lifelines.callFriend && !gameState.isAnswerSubmitted
                        ? 'bg-oman-blue border-oman-gold text-oman-gold hover:bg-oman-gold hover:text-oman-dark hover:scale-105' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed line-through'
                    }`}
                    title="الاتصال بصديق"
                  >
                    <PhoneCall className="w-4 h-4 md:w-5 md:h-5" />
                  </button>

                  {/* Change Question */}
                  <button 
                    id="lifeline-change-question"
                    onClick={useChangeQuestion}
                    disabled={!gameState.lifelines.changeQuestion || gameState.isAnswerSubmitted}
                    className={`p-2.5 md:p-3 rounded-full border transition-all shadow-md relative group cursor-pointer ${
                      gameState.lifelines.changeQuestion && !gameState.isAnswerSubmitted
                        ? 'bg-oman-blue border-oman-gold text-oman-gold hover:bg-oman-gold hover:text-oman-dark hover:scale-105' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed line-through'
                    }`}
                    title="تغيير السؤال"
                  >
                    <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>

                {/* Mobile Prize Ladder Trigger */}
                <button 
                  id="mobile-prize-tree-trigger"
                  onClick={() => { soundManager.playChime(); setShowPrizeTreeMobile(true); }}
                  className="lg:hidden bg-oman-blue px-3 py-1.5 rounded-lg border border-oman-gold text-oman-gold text-xs font-bold hover:bg-oman-gold/20 cursor-pointer"
                >
                  شجرة الجوائز: {PRIZES[gameState.currentLevel].toLocaleString('ar-OM')} ر.ع.
                </button>

                {/* Timer Countdown Area */}
                <div className="flex items-center gap-3">
                  <div className="text-left font-mono">
                    <span className="text-xs text-slate-400 block">الزمن المتبقي</span>
                    <span className={`text-xl md:text-2xl font-bold ${gameState.timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-oman-gold'}`}>
                      {gameState.timeRemaining} ثانية
                    </span>
                  </div>

                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle 
                        cx="24" cy="24" r="20" 
                        stroke="rgba(229,192,96,0.1)" 
                        strokeWidth="3.5" 
                        fill="transparent" 
                      />
                      <motion.circle 
                        cx="24" cy="24" r="20" 
                        stroke={gameState.timeRemaining <= 10 ? "#ef4444" : "#e5c060"} 
                        strokeWidth="3.5" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 20}
                        animate={{ strokeDashoffset: (2 * Math.PI * 20) * (1 - gameState.timeRemaining / 60) }}
                        transition={{ ease: "linear" }}
                      />
                    </svg>
                    <Timer className={`w-5 h-5 absolute text-oman-gold ${gameState.timeRemaining <= 10 ? 'text-red-500' : ''}`} />
                  </div>
                </div>

              </div>

              {/* Transition progress bar */}
              <AnimatePresence>
                {transitionCountdown !== null && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full bg-slate-900/60 p-3.5 rounded-xl border border-oman-gold/20 flex flex-col space-y-2 mt-2"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-oman-gold font-bold">جاري الانتقال التلقائي للسؤال التالي...</span>
                      <span className="font-mono text-white bg-oman-gold/20 px-2.5 py-0.5 rounded-full font-bold">
                        {transitionCountdown} ثانية
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden relative border border-white/5">
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="h-full bg-gradient-to-r from-amber-500 via-oman-gold to-yellow-300 shadow-lg shadow-oman-gold/30"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Central Question Display & Answer Options with Smooth Fade, Zoom & Spin Transitions */}
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, scale: 0.92, rotateY: lifelineAnimation === 'changeQuestion' ? 180 : 0 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="space-y-6"
              >
                <div className="w-full relative py-4 flex flex-col items-center">
                  <div className="absolute -inset-1 bg-oman-gold/15 blur-xl rounded-full pointer-events-none"></div>
                  <div className="relative w-full bg-slate-900/80 border-y-2 border-oman-gold py-8 px-8 md:px-12 text-center hex-shape gold-glow min-h-[160px] md:min-h-[220px] flex flex-col justify-center items-center">
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-950 px-5 py-0.5 text-xs text-oman-gold font-bold tracking-widest uppercase border border-oman-gold/40 rounded-full">
                      السؤال {gameState.currentLevel + 1}
                    </span>
                    
                    {/* Category tag */}
                    <div className="absolute top-3 right-6 bg-oman-gold/15 px-3 py-1 rounded-full text-[10px] md:text-xs text-oman-gold font-bold border border-oman-gold/20 flex items-center gap-1.5">
                      <Compass className="w-3 h-3" />
                      <span>تراث عُمان: {currentQuestion.category}</span>
                    </div>

                    <div className="absolute top-3 left-6 text-[10px] md:text-xs text-slate-400 font-mono">
                      صعوبة السؤال: {currentQuestion.difficulty === 'easy' ? 'سهل' : currentQuestion.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                    </div>

                    {/* Question Text */}
                    <motion.h3 
                      key={currentQuestion.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="font-serif text-lg md:text-xl lg:text-2xl font-extrabold text-slate-100 leading-relaxed md:leading-loose max-w-3xl mt-6 px-2"
                    >
                      {currentQuestion.questionText}
                    </motion.h3>
                  </div>
                </div>

                {/* Answer Choices Options A, B, C, D */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => {
                    const isHidden = gameState.fiftyFiftyHidden.includes(key);
                    const isSelected = gameState.selectedAnswer === key;
                    const isCorrect = key === currentQuestion.correctAnswer;
                    const showResult = gameState.isAnswerSubmitted;

                    let buttonStyles = "bg-slate-900/60 border border-white/20 text-slate-100 hover:border-oman-gold hover:bg-slate-900/90 transition-all duration-300";
                    
                    if (isHidden) {
                      buttonStyles = "opacity-0 scale-75 duration-700 transition-all pointer-events-none absolute w-0 h-0 overflow-hidden";
                    } else if (showResult) {
                      if (isCorrect) {
                        buttonStyles = "green-pulse-active border-2 text-white font-bold";
                      } else if (isSelected) {
                        buttonStyles = "red-pulse-active border-2 text-white font-bold";
                      } else {
                        buttonStyles = "opacity-35 border-slate-900 text-slate-500 bg-slate-950/20 pointer-events-none";
                      }
                    } else if (isWaitingForReveal && isSelected) {
                      buttonStyles = "orange-pulse-active border-2 text-white font-bold";
                    } else if (isSelected) {
                      buttonStyles = "orange-pulse-active border-2 text-white font-bold";
                    }

                    const arabicOptionPrefix: Record<string, string> = {
                      A: "أ", B: "ب", C: "ج", D: "د"
                    };

                    return (
                      <button
                        id={`option-button-${key}`}
                        key={key}
                        onClick={() => handleSelectOption(key)}
                        disabled={isHidden || gameState.isAnswerSubmitted || isWaitingForReveal}
                        className={`relative px-8 py-5 text-right text-sm md:text-base font-bold transition-all flex items-center justify-between group shadow-md hex-shape ${buttonStyles} cursor-pointer`}
                      >
                        {/* Left side prefix design */}
                        <span className="flex items-center gap-3">
                          <span className="text-oman-gold font-extrabold text-lg ml-1 font-mono">
                            {key} ({arabicOptionPrefix[key]}):
                          </span>
                          <span className="leading-snug pr-1">{currentQuestion.options[key]}</span>
                        </span>

                        {/* Right side check status indicators */}
                        {showResult && isCorrect && (
                          <span className="text-xs text-green-400 flex items-center gap-1 font-sans bg-green-950/60 px-2 py-1 rounded border border-green-500/20">
                            <span>صحيحة</span>
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <span className="text-xs text-red-400 flex items-center gap-1 font-sans bg-red-950/60 px-2 py-1 rounded border border-red-500/20">
                            <span>خاطئة</span>
                            <AlertTriangle className="w-4 h-4" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Bottom Gameplay Console: Submit/Next and Withdrawal Buttons */}
              <div className="flex justify-between items-center gap-4 mt-2">
                
                {/* Withdrawal button */}
                <button 
                  id="withdraw-btn"
                  onClick={handleWithdraw}
                  disabled={gameState.isAnswerSubmitted}
                  className={`px-5 py-3 rounded-xl font-bold text-sm md:text-base transition-all flex items-center gap-2 border shadow-lg cursor-pointer ${
                    gameState.isAnswerSubmitted
                      ? 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-red-950/70 border-red-500/30 text-red-300 hover:bg-red-900/80 hover:border-red-400'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>الانسحاب وتثبيت الجائزة</span>
                </button>

                {/* Submit / Next Step Controller */}
                {!gameState.isAnswerSubmitted ? (
                  <button 
                    id="submit-answer-btn"
                    onClick={handleSubmitAnswer}
                    disabled={!gameState.selectedAnswer}
                    className={`px-8 py-3.5 rounded-xl text-base font-extrabold transition-all border shadow-lg cursor-pointer ${
                      gameState.selectedAnswer 
                        ? 'bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-oman-dark border-amber-300' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    اعتماد الإجابة النهائية
                  </button>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.95 }} 
                    animate={{ scale: 1 }}
                    className="flex items-center gap-3"
                  >
                    {/* Success/Error banner text */}
                    {gameState.selectedAnswer === currentQuestion.correctAnswer ? (
                      <div className="text-right ml-4">
                        <span className="text-xs text-slate-300 block">مرشد التراث يخبرك:</span>
                        <span className="text-green-400 font-bold text-sm md:text-base block">
                          {gameState.currentLevel === 4 
                            ? "رائع! إجابة صحيحة. لقد بلغت محطة الأمان الأولى (1,000 ريال)!" 
                            : gameState.currentLevel === 9 
                            ? "مذهل! لقد بلغت محطة الأمان الثانية وتأهلت للذهب (32,000 ريال)!" 
                            : gameState.currentLevel === 12 
                            ? "أنت تقترب جداً! محطة الأمان الثالثة مقفلة (250,000 ريال)!"
                            : gameState.currentLevel >= 13 
                            ? "أنت خبير خارق للتراث العُماني! اقتربت خطوة واحدة من المليون!"
                            : "رائع! إجابة صحيحة. أنت خبير في التراث العُماني!"}
                        </span>
                      </div>
                    ) : (
                      <div className="text-right ml-4">
                        <span className="text-xs text-slate-300 block">مرشد التراث يخبرك:</span>
                        <span className="text-red-400 font-bold text-sm md:text-base block">
                          للأسف إجابة غير صحيحة، حاول في مسابقة أخرى.
                        </span>
                      </div>
                    )}

                    {gameState.selectedAnswer === currentQuestion.correctAnswer ? (
                      <button 
                        id="next-question-btn"
                        onClick={handleNextQuestion}
                        className="px-8 py-3.5 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-extrabold text-base rounded-xl border border-green-300/30 shadow-lg cursor-pointer relative overflow-hidden group flex items-center gap-2"
                      >
                        {/* Progress line indicator at the bottom of the button */}
                        {transitionCountdown !== null && (
                          <motion.div 
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            className="absolute bottom-0 right-0 h-1 bg-white/40"
                          />
                        )}
                        <span>السؤال التالي</span>
                        {transitionCountdown !== null && (
                          <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-mono font-bold">
                            {transitionCountdown}ث
                          </span>
                        )}
                      </button>
                    ) : (
                      <button 
                        id="finish-game-btn"
                        onClick={() => handleGameOver(gameState.currentLevel)}
                        className="px-8 py-3.5 bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-extrabold text-base rounded-xl border border-red-300/30 shadow-lg cursor-pointer"
                      >
                        رؤية النتيجة النهائية
                      </button>
                    )}
                  </motion.div>
                )}

              </div>

            </div>

            {/* RIGHT COLUMN: PRIZE LADDER TREE (DESKTOP) */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="blue-glass rounded-2xl p-4 border border-oman-gold/20 flex flex-col justify-between h-full shadow-lg">
                <div className="text-center pb-2 border-b border-oman-gold/20 mb-3">
                  <h4 className="font-serif text-sm font-bold text-oman-gold-light">شجرة الجوائز والتحدي</h4>
                </div>
                
                <div className="flex-1 flex flex-col justify-between text-xs font-mono">
                  {PRIZES.map((prize, idx) => {
                    const isCurrent = gameState.currentLevel === idx;
                    const isPassed = gameState.currentLevel > idx;
                    const isSafe = isSafeHaven(prize);
                    const isMillion = prize === 1000000;

                    let rowStyles = "text-slate-400";
                    let numStyles = "bg-oman-dark text-slate-500 border border-slate-800";

                    if (isCurrent) {
                      rowStyles = "prize-active py-1 px-4 rounded-lg shadow-lg border border-oman-gold/30";
                      numStyles = "bg-slate-900 text-oman-gold font-bold border border-oman-gold";
                    } else if (isPassed) {
                      rowStyles = "text-green-400 font-semibold bg-green-950/20 rounded-lg border border-green-500/10";
                      numStyles = "bg-green-900 text-green-100 border border-green-500/30";
                    } else if (isSafe) {
                      rowStyles = "text-white font-bold bg-amber-500/5 rounded-lg border border-oman-gold/20 safe-point animate-pulse";
                      numStyles = "bg-oman-dark text-oman-gold border border-oman-gold/40";
                    }

                    return (
                      <div 
                        key={prize}
                        className={`px-3 py-1 flex items-center justify-between transition-all ${rowStyles}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${numStyles}`}>
                            {idx + 1}
                          </span>
                          <span className="font-sans font-bold">
                            {prize.toLocaleString('ar-OM')} ريال
                          </span>
                        </div>

                        {/* Safe haven and millionaire markers */}
                        {isMillion ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 font-sans font-extrabold animate-pulse">
                            الكأس 🏆
                          </span>
                        ) : isSafe ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-oman-gold/15 text-oman-gold-light border border-oman-gold/30 font-sans font-extrabold">
                            أمان 🔒
                          </span>
                        ) : null}
                      </div>
                    );
                  }).reverse() /* Show highest at top */}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==================== SCREEN 3: END SCREEN ==================== */}
        {gameState.hasGameStarted && gameState.isGameOver && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl blue-glass rounded-2xl p-6 md:p-10 text-center gold-border relative overflow-hidden shadow-2xl"
          >
            {gameState.hasWonMillion ? (
              // Million Rial Winner Screen
              <div className="space-y-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 rounded-full flex items-center justify-center shadow-xl border-2 border-oman-gold-light animate-bounce">
                  <Trophy className="w-12 h-12 text-oman-dark" />
                </div>

                <div className="space-y-2">
                  <h2 className="font-serif text-3xl md:text-5xl font-extrabold text-oman-gold leading-tight gold-glow">
                    🏆 مبارك يا بطل التراث! 🏆
                  </h2>
                  <p className="font-serif text-lg md:text-2xl text-oman-gold-light">
                    لقد أصبحت خبير التراث العُماني المطلق وربحت المليون!
                  </p>
                </div>

                <div className="blue-glass max-w-md mx-auto p-6 rounded-xl border border-oman-gold/30 shadow-inner">
                  <p className="text-slate-300 text-sm mb-1">المتسابق الفائز باللقب:</p>
                  <h3 className="text-2xl font-black text-white mb-4">{gameState.playerName}</h3>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-oman-dark/60 p-3 rounded-lg border border-oman-gold/10">
                      <span className="text-xs text-slate-400 block">الجائزة المالية الكبرى</span>
                      <span className="text-xl md:text-2xl font-mono font-black text-oman-gold">1,000,000 ريال</span>
                    </div>
                    <div className="bg-oman-dark/60 p-3 rounded-lg border border-oman-gold/10">
                      <span className="text-xs text-slate-400 block">الإجابات الصحيحة</span>
                      <span className="text-xl md:text-2xl font-mono font-black text-green-400">15 / 15 سؤال</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  حفظك الله يا ابن عُمان البار! معرفتك العميقة بتاريخ عُمان، قلاعها، أفلاجها، وفنونها تؤهلك لتكون سفيراً للتراث العُماني الخالد.
                </p>
              </div>
            ) : (
              // Standard game over/withdrawal screen
              <div className="space-y-6">
                <div className="w-20 h-20 mx-auto bg-oman-dark border border-oman-gold/30 rounded-full flex items-center justify-center shadow-lg">
                  <Award className="w-10 h-10 text-oman-gold" />
                </div>

                <div className="space-y-2">
                  <h2 className="font-serif text-2xl md:text-4xl font-extrabold text-oman-gold leading-tight gold-glow">
                    انتهت مسيرتك في كنز التراث
                  </h2>
                  <p className="font-serif text-base md:text-xl text-oman-gold-light">
                    {gameState.currentLevel === 14 ? (
                      "تقدير ممتاز لجهدك الملموس وثقافتك التاريخية!"
                    ) : (
                      "شكراً لجهودك، حاول مرة أخرى"
                    )}
                  </p>
                </div>

                <div className="blue-glass max-w-md mx-auto p-6 rounded-xl border border-oman-gold/20 shadow-inner">
                  <p className="text-slate-400 text-sm mb-1">المتسابق الكريم:</p>
                  <h3 className="text-xl font-bold text-white mb-4">{gameState.playerName}</h3>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-oman-dark/60 p-3 rounded-lg border border-oman-gold/10">
                      <span className="text-xs text-slate-400 block">الجائزة المستحقة</span>
                      <span className="text-lg md:text-xl font-mono font-black text-oman-gold">
                        {getWalkawayPrize(gameState.currentLevel).toLocaleString('ar-OM')} ريال
                      </span>
                    </div>
                    <div className="bg-oman-dark/60 p-3 rounded-lg border border-oman-gold/10">
                      <span className="text-xs text-slate-400 block">الإجابات الصحيحة</span>
                      <span className="text-lg md:text-xl font-mono font-black text-green-400">
                        {gameState.currentLevel} / 15 سؤال
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  {getWalkawayPrize(gameState.currentLevel) > 0 
                    ? "أحسنت! لقد تمكنت من تثبيت جائزتك والعبور لبر الأمان بجائزة قيمة." 
                    : "محاولة طيبة جداً! التراث العُماني غني وواسع، والهدف هو المعرفة والتثقيف أولاً."}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-6 border-t border-oman-gold/10 mt-6 max-w-md mx-auto">
              <button 
                id="play-again-btn"
                onClick={playAgain}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-oman-dark font-extrabold text-base rounded-xl transition-all shadow-lg cursor-pointer"
              >
                العب مرة أخرى
              </button>

              <button 
                id="back-home-btn"
                onClick={resetToHome}
                className="w-full sm:w-auto px-8 py-3 bg-oman-blue border border-oman-gold/40 text-oman-gold hover:bg-oman-gold/10 font-bold text-base rounded-xl transition-all shadow-md cursor-pointer"
              >
                الرجوع للرئيسية
              </button>
            </div>
          </motion.div>
        )}

      </main>

      {/* Footer Credentials */}
      <footer className="py-4 text-center text-[10px] md:text-xs text-slate-500 border-t border-oman-gold/10 mt-8 z-10 blue-glass">
        <p>جميع حقوق الأسئلة محفوظة ومستقاة من الموسوعة العُمانية الرسمية والكتب التراثية</p>
        <p className="mt-1 font-serif text-oman-gold/60">سلطنة عُمان - الحفاظ على الهوية والتاريخ</p>
      </footer>

      {/* ==================== INSTRUCTIONS MODAL ==================== */}
      <AnimatePresence>
        {showInstructions && (
          <div className="fixed inset-0 bg-oman-dark/95 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl blue-glass rounded-2xl p-6 md:p-8 border border-oman-gold text-right shadow-2xl space-y-4"
            >
              <h3 className="font-serif text-2xl font-bold text-oman-gold pb-3 border-b border-oman-gold/20 flex items-center gap-2">
                <HelpCircle className="w-6 h-6" />
                <span>تعليمات وقوانين اللعبة</span>
              </h3>

              <div className="space-y-3 text-sm text-slate-300 leading-relaxed overflow-y-auto max-h-[60vh] pl-2 font-sans">
                <p>
                  أهلاً بك في مسابقة <strong className="text-oman-gold">"من سيربح المليون التراثي - كنز التراث العُماني"</strong>، رحلة ممتعة وشيقة بين طيات التاريخ العُماني المشرق والمعالم الأثرية والموروثات الشعبية الأصيلة.
                </p>

                <div className="space-y-1 bg-oman-dark/40 p-3 rounded-lg border border-oman-gold/10">
                  <strong className="text-oman-gold-light block mb-1">🎮 آلية الأسئلة والجوائز:</strong>
                  <ul className="list-disc list-inside space-y-1 mr-2 text-xs">
                    <li>تتكون المسابقة من <strong className="text-white">15 سؤالاً</strong> تصاعدية الصعوبة للوصول إلى المليون ريال عُماني.</li>
                    <li>تتوزع الأسئلة بين <strong className="text-white">سهل</strong> (الأسئلة 1-5)، <strong className="text-white">متوسط</strong> (الأسئلة 6-10)، و<strong className="text-white">صعب جداً</strong> (الأسئلة 11-15).</li>
                    <li>لكل سؤال عداد زمني مقداره <strong className="text-amber-400">30 ثانية</strong> للإجابة وتثبيتها.</li>
                  </ul>
                </div>

                <div className="space-y-1 bg-oman-dark/40 p-3 rounded-lg border border-oman-gold/10">
                  <strong className="text-oman-gold-light block mb-1">🔒 محطات الأمان الثلاثة:</strong>
                  <p className="text-xs">إذا تخطيت أي محطة أمان وأخطأت لاحقاً، تضمن الخروج بقيمة محطة الأمان التي حققتها:</p>
                  <ul className="list-disc list-inside space-y-1 mr-2 text-xs">
                    <li>المحطة الأولى: <strong className="text-white">1,000 ريال عُماني</strong> (بعد السؤال الخامس).</li>
                    <li>المحطة الثانية: <strong className="text-white">32,000 ريال عُماني</strong> (بعد السؤال العاشر).</li>
                    <li>المحطة الثالثة: <strong className="text-white">250,000 ريال عُماني</strong> (بعد السؤال الثالث عشر).</li>
                  </ul>
                </div>

                <div className="space-y-1 bg-oman-dark/40 p-3 rounded-lg border border-oman-gold/10">
                  <strong className="text-oman-gold-light block mb-1">🛠️ وسائل المساعدة المتوفرة:</strong>
                  <ul className="list-decimal list-inside space-y-1.5 mr-2 text-xs">
                    <li><strong className="text-white">حذف إجابتين (50/50):</strong> يقوم بحذف خيارين خاطئين بشكل عشوائي ويبقى الخيار الصحيح وخيار خاطئ واحد.</li>
                    <li><strong className="text-white">سؤال الجمهور:</strong> يستفتي الجمهور الافتراضي لتظهر نسب تصويتهم لكل خيار بناءً على صعوبة السؤال.</li>
                    <li><strong className="text-white">الاتصال بصديق:</strong> يمكنك اختيار واحد من ثلاثة خبراء تراث عُمانيين لاستشارته والحصول على اقتراحه.</li>
                    <li><strong className="text-white">تغيير السؤال:</strong> يستبدل السؤال الحالي بسؤال آخر عشوائي من نفس الفئة والصعوبة (مرة واحدة فقط).</li>
                  </ul>
                </div>

                <p className="text-xs text-amber-200/80 italic">
                  * يمكنك الانسحاب في أي لحظة قبل اعتماد الإجابة لتحتفظ بجميع أموالك التي جمعتها في السؤال السابق.
                </p>
              </div>

              <div className="pt-4 border-t border-oman-gold/10 flex justify-end">
                <button 
                  id="close-instructions-btn"
                  onClick={() => { soundManager.playChime(); setShowInstructions(false); }}
                  className="px-6 py-2.5 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-oman-dark font-extrabold text-sm rounded-xl cursor-pointer shadow-md"
                >
                  فهمت وقبلت التحدي
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== ACTIVE LIFELINE MODALS ==================== */}
      <AnimatePresence>
        {gameState.lifelineActive === 'callFriend' && (
          <div className="fixed inset-0 bg-oman-dark/90 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md blue-glass rounded-2xl p-6 border border-oman-gold text-right shadow-2xl space-y-4"
            >
              <h3 className="font-serif text-xl font-bold text-oman-gold pb-2 border-b border-oman-gold/20 flex items-center gap-2">
                <PhoneCall className="w-5 h-5" />
                <span>الاتصال بصديق تراثي</span>
              </h3>

              {!selectedFriend ? (
                // Step A: Choose Friend
                <div className="space-y-3">
                  <p className="text-xs text-slate-300">اختر واحداً من الخبراء العُمانيين الثلاثة لتستشيره في هذا السؤال الحرج:</p>
                  
                  <div className="space-y-2">
                    {FRIENDS.map((friend) => {
                      const isSpecialty = currentQuestion?.category === friend.specialty;
                      return (
                        <button
                          id={`select-friend-${friend.name.replace(' ', '-')}`}
                          key={friend.name}
                          onClick={() => handleSelectFriend(friend)}
                          className="w-full p-3 rounded-xl bg-oman-dark/60 border border-oman-gold/20 hover:border-oman-gold hover:bg-oman-gold/5 text-right transition-all flex items-start gap-3 cursor-pointer"
                        >
                          <span className="text-3xl p-1 bg-oman-blue/80 rounded-lg border border-oman-gold/10">{friend.avatar}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-oman-gold-light">{friend.name}</span>
                              {isSpecialty && (
                                <span className="text-[9px] bg-green-500/20 text-green-300 border border-green-500/30 px-1.5 py-0.5 rounded font-sans font-bold">
                                  مجال تخصصي 🌟
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{friend.role}</span>
                            <span className="text-[11px] text-slate-300 block mt-1 leading-normal">{friend.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : callProgress === 'calling' ? (
                // Step B: Ringing Screen
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                  <div className="relative flex items-center justify-center">
                    {/* Concentric Pulsing Ripples */}
                    <motion.div
                      animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                      className="absolute w-24 h-24 bg-oman-gold/20 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0.5, ease: "easeOut" }}
                      className="absolute w-24 h-24 bg-oman-gold/15 rounded-full"
                    />
                    {/* Ringing Avatar Container */}
                    <motion.div
                      animate={{ 
                        rotate: [0, -6, 6, -6, 6, 0],
                        y: [0, -3, 3, -3, 3, 0]
                      }}
                      transition={{ repeat: Infinity, duration: 0.5, repeatType: "mirror" }}
                      className="w-24 h-24 bg-oman-blue rounded-full border-2 border-oman-gold flex items-center justify-center text-5xl relative z-10 shadow-lg shadow-oman-gold/10"
                    >
                      {selectedFriend.avatar}
                    </motion.div>
                  </div>

                  <div className="text-center space-y-2">
                    <h4 className="font-bold text-lg text-oman-gold-light">{selectedFriend.name}</h4>
                    <p className="text-xs text-slate-400 font-sans tracking-wide">جاري الاتصال بالصديق للتناقش...</p>
                  </div>

                  {/* Dynamic sound wave indicator */}
                  <div className="flex justify-center items-center gap-1.5 h-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [8, 24, 8] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                        className="w-1 bg-oman-gold rounded-full"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                // Step C: Dialogue outcome
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-oman-dark/40 p-3 rounded-xl border border-oman-gold/10">
                    <span className="text-4xl">{selectedFriend.avatar}</span>
                    <div>
                      <h4 className="font-bold text-sm text-oman-gold-light">{selectedFriend.name}</h4>
                      <p className="text-[10px] text-slate-400">{selectedFriend.role}</p>
                    </div>
                  </div>

                  <div className="bg-oman-blue p-4 rounded-xl border border-oman-gold/20 relative">
                    <div className="absolute top-2 left-3 opacity-10">
                      <Compass className="w-12 h-12 text-oman-gold" />
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-serif whitespace-pre-wrap">
                      "{gameState.friendResponse}"
                    </p>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-normal italic">
                    * يرجى العلم بأن رأي الصديق مبني على اجتهاد شخصي وخبرة، والقرار النهائي يعود لك كلياً.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-oman-gold/10 flex justify-end">
                <button 
                  id="close-friend-modal-btn"
                  onClick={closeLifelineActive}
                  className="px-5 py-2 bg-oman-blue border border-oman-gold text-oman-gold hover:bg-oman-gold/10 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إغلاق والمتابعة
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {gameState.lifelineActive === 'askAudience' && gameState.audienceVotes && (
          <div className="fixed inset-0 bg-oman-dark/90 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm blue-glass rounded-2xl p-6 border border-oman-gold text-right shadow-2xl space-y-4"
            >
              <h3 className="font-serif text-xl font-bold text-oman-gold pb-2 border-b border-oman-gold/20 flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>نتائج استفتاء الجمهور</span>
              </h3>

              <p className="text-xs text-slate-300 leading-normal">
                أدلى الجمهور الافتراضي المتواجد في مسرح المسابقة بأصواتهم سريعاً على السؤال الحالي، وجاءت النسب كالآتي:
              </p>

              <div className="space-y-3 pt-2">
                {(['A', 'B', 'C', 'D'] as const).map((key) => {
                  const percent = gameState.audienceVotes?.[key] || 0;
                  const isHidden = gameState.fiftyFiftyHidden.includes(key);
                  const isCorrect = key === currentQuestion?.correctAnswer;
                  
                  const arabicOptionPrefix: Record<string, string> = {
                    A: "أ", B: "ب", C: "ج", D: "د"
                  };

                  return (
                    <div key={key} className={isHidden ? 'opacity-30' : ''}>
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-slate-300">
                          الخيار [{arabicOptionPrefix[key]}]: {currentQuestion?.options[key]}
                        </span>
                        <span className="font-mono text-oman-gold">{percent}%</span>
                      </div>
                      
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-oman-gold/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${isCorrect ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-amber-600 to-amber-500'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-400 leading-normal italic mt-2">
                * ملاحظة: عادةً ما يمتلك الجمهور العُماني وعياً كبيراً بتراث بلاده، غير أنهم قد يترددون في الأسئلة الصعبة!
              </p>

              <div className="pt-3 border-t border-oman-gold/10 flex justify-end">
                <button 
                  id="close-audience-modal-btn"
                  onClick={closeLifelineActive}
                  className="px-5 py-2 bg-oman-blue border border-oman-gold text-oman-gold hover:bg-oman-gold/10 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إغلاق والمتابعة
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ==================== SCREEN: MOBILE PRIZE TREE DRAWER ==================== */}
        {showPrizeTreeMobile && (
          <div className="fixed inset-0 bg-oman-dark/95 z-40 flex items-end justify-center lg:hidden">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md blue-glass rounded-t-3xl p-6 border-t border-oman-gold border-x border-oman-gold/30 text-right shadow-2xl max-h-[85vh] flex flex-col justify-between"
            >
              <div className="flex justify-between items-center pb-3 border-b border-oman-gold/20 mb-4">
                <button 
                  id="close-mobile-prize-tree-btn"
                  onClick={() => { soundManager.playChime(); setShowPrizeTreeMobile(false); }}
                  className="p-1.5 rounded-lg bg-oman-blue border border-oman-gold/30 text-oman-gold hover:bg-oman-gold/20"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="font-serif text-lg font-bold text-oman-gold">شجرة الجوائز والدرجات</h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                {PRIZES.map((prize, idx) => {
                  const isCurrent = gameState.currentLevel === idx;
                  const isPassed = gameState.currentLevel > idx;
                  const isSafe = isSafeHaven(prize);
                  const isMillion = prize === 1000000;

                  let rowStyles = "text-slate-400";
                  let numStyles = "bg-oman-dark text-slate-500 border border-slate-800";

                  if (isCurrent) {
                    rowStyles = "prize-active py-1.5 px-4 rounded-lg shadow-lg border border-oman-gold/30";
                    numStyles = "bg-slate-900 text-oman-gold font-bold border border-oman-gold";
                  } else if (isPassed) {
                    rowStyles = "text-green-400 font-semibold bg-green-950/20 rounded-lg border border-green-500/10";
                    numStyles = "bg-green-900 text-green-100 border border-green-500/30";
                  } else if (isSafe) {
                    rowStyles = "text-white font-bold bg-amber-500/5 rounded-lg border border-oman-gold/20 safe-point animate-pulse";
                    numStyles = "bg-oman-dark text-oman-gold border border-oman-gold/40";
                  }

                  return (
                    <div 
                      key={prize}
                      className={`px-3 py-1.5 flex items-center justify-between rounded-lg transition-all ${rowStyles}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${numStyles}`}>
                          {idx + 1}
                        </span>
                        <span className="font-sans font-bold">
                          {prize.toLocaleString('ar-OM')} ريال عُماني
                        </span>
                      </div>

                      {isMillion ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 font-sans font-extrabold animate-pulse">
                          🏆 كنز التراث
                        </span>
                      ) : isSafe ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-oman-gold/15 text-oman-gold-light border border-oman-gold/30 font-sans font-extrabold">
                          🔒 محطة أمان
                        </span>
                      ) : null}
                    </div>
                  );
                }).reverse()}
              </div>

              <div className="pt-4 border-t border-oman-gold/10 mt-4">
                <button 
                  id="close-mobile-prize-tree-bottom-btn"
                  onClick={() => { soundManager.playChime(); setShowPrizeTreeMobile(false); }}
                  className="w-full py-2.5 bg-oman-blue border border-oman-gold text-oman-gold font-bold text-sm rounded-xl"
                >
                  العودة للوحة اللعب
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== CELEBRATION OVERLAYS ==================== */}
      <AnimatePresence>
        {showCelebration && celebrationType === 'safeHaven' && (
          <div className="fixed inset-0 bg-oman-dark/95 z-50 flex items-center justify-center p-4 animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-full max-w-md blue-glass rounded-2xl p-8 border-2 border-oman-gold text-center shadow-2xl relative overflow-hidden space-y-6"
            >
              {/* Confetti simulation elements */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: ["-10%", "110%"],
                      x: [`${Math.sin(i) * 30}%`, `${Math.sin(i + 1) * 30}%`],
                      rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)]
                    }}
                    transition={{
                      duration: 3 + (i % 4),
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                      left: `${5 + i * 4.5}%`,
                      backgroundColor: i % 3 === 0 ? '#D4AF37' : i % 3 === 1 ? '#FBE6A2' : '#3b82f6',
                      opacity: 0.75
                    }}
                  />
                ))}
              </div>

              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 bg-oman-gold/25 border border-oman-gold rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg"
              >
                🔒
              </motion.div>

              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-bold text-oman-gold gold-glow">وصول مبارك ومضمون!</h3>
                <p className="font-serif text-lg text-oman-gold-light">لقد اجتزت محطة الأمان بنجاح</p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-oman-gold/10 text-center font-mono">
                <span className="text-xs text-slate-400 block mb-1">المبلغ المضمون في حوزتك الآن</span>
                <span className="text-2xl font-extrabold text-white">
                  {PRIZES[gameState.currentLevel].toLocaleString('ar-OM')} ريال عُماني
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-serif">
                حتى وإن أخطأت في الأسئلة القادمة، فإن هذه الجائزة النقدية مضمونة لك بنسبة 100% ولن تفقدها أبداً!
              </p>

              <button
                onClick={() => {
                  setShowCelebration(false);
                  setTransitionCountdown(5);
                }}
                className="w-full py-3 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-oman-dark font-extrabold text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border border-amber-300/30"
              >
                متابعة رحلة التحدي
              </button>
            </motion.div>
          </div>
        )}

        {showCelebration && celebrationType === 'million' && (
          <div className="fixed inset-0 bg-oman-dark/98 z-50 flex items-center justify-center p-4 animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              className="w-full max-w-xl blue-glass rounded-3xl p-8 md:p-12 border-2 border-oman-gold text-center shadow-2xl relative overflow-hidden space-y-8"
            >
              {/* Falling Golden Fireworks / sparkles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(35)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: ["-10%", "110%"],
                      x: [`${Math.sin(i * 3) * 40}%`, `${Math.sin(i * 3 + 2) * 40}%`],
                      scale: [0.5, 1.2, 0.5],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 4 + (i % 3),
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.15
                    }}
                    className="absolute text-xl"
                    style={{
                      left: `${10 + i * 2.3}%`,
                      color: i % 2 === 0 ? '#D4AF37' : '#FBE6A2'
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </div>

              {/* Glowing Omani Khanjar Golden Emblem */}
              <div className="relative">
                <div className="absolute inset-0 bg-oman-gold/25 blur-3xl rounded-full scale-125"></div>
                <motion.div
                  animate={{ 
                    rotateY: [0, 360],
                    scale: [1, 1.15, 1]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 5,
                    ease: "easeInOut"
                  }}
                  className="w-32 h-32 md:w-36 md:h-36 flex items-center justify-center border-4 border-oman-gold bg-slate-950 rounded-full mb-3 shadow-2xl relative z-10 mx-auto"
                >
                  {/* Khanjar traditional Omani dagger SVG */}
                  <svg className="w-20 h-20 text-oman-gold" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A3,3 0 0,0 9,5C9,6.05 9.54,7 10.38,7.56L9.12,14.65C9,15.34 9.5,16 10.2,16H13.8C14.5,16 15,15.34 14.88,14.65L13.62,7.56C14.46,7 15,6.05 15,5A3,3 0 0,0 12,2M12,4A1,1 0 0,1 13,5A1,1 0 0,1 12,6A1,1 0 0,1 11,5A1,1 0 0,1 12,4M10,18V20H14V18H10M8,21V22H16V21H8Z" />
                  </svg>
                  <div className="absolute inset-0 rounded-full border-2 border-oman-gold animate-ping opacity-25" />
                </motion.div>
              </div>

              <div className="space-y-3 relative z-10">
                <motion.h2 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="font-serif text-3xl md:text-5xl font-extrabold text-oman-gold tracking-wider gold-glow"
                >
                  فوزٌ تاريخي عظيم!
                </motion.h2>
                <div className="h-[2px] w-48 bg-gradient-to-r from-transparent via-oman-gold to-transparent mx-auto" />
                <p className="font-serif text-xl md:text-2xl text-oman-gold-light font-bold">
                  مبارك! أصبحت خبير التراث العُماني وربحت المليون!
                </p>
              </div>

              <div className="bg-slate-950/80 p-6 rounded-2xl border-2 border-oman-gold/30 max-w-sm mx-auto relative z-10 shadow-inner">
                <span className="text-xs text-slate-400 block mb-1">جائزة الأبطال الكبرى</span>
                <span className="text-3xl md:text-4xl font-extrabold text-white tracking-widest font-mono">
                  1,000,000 ر.ع.
                </span>
                <span className="text-xs text-oman-gold-light block mt-1">مليون ريال عُماني كاملة</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-serif max-w-md mx-auto">
                لقد خضت غمار 15 سؤالاً عن تاريخ مجان الأصيل ومكتشفاتها الأثرية وحصونها الشامخة وموروثها الشفهي والاجتماعي العريق. أثبتّ اليوم أنك حارس التراث الحقيقي!
              </p>

              <button
                onClick={() => {
                  soundManager.playChime();
                  setShowCelebration(false);
                }}
                className="px-10 py-4 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-oman-dark font-extrabold text-base rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer border border-amber-300/30 relative z-10"
              >
                متابعة والاطلاع على النتائج النهائية
              </button>
            </motion.div>
          </div>
        )}

        {showLeaderboardClearConfirm && (
          <div className="fixed inset-0 bg-oman-dark/95 z-50 flex items-center justify-center p-4 animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-slate-900 border-2 border-red-500/50 rounded-2xl p-6 text-center shadow-2xl relative space-y-5"
            >
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-3xl mx-auto text-red-500">
                ⚠️
              </div>

              <div className="space-y-1.5">
                <h3 className="font-serif text-lg font-bold text-white">هل أنت متأكد من مسح سجل المتسابقين؟</h3>
                <p className="text-xs text-slate-400">سيتم حذف كافة النتائج والبيانات المخزنة نهائياً ولا يمكن استعادتها.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClearLeaderboard}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  نعم، احذف السجل
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaderboardClearConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-xl transition-all border border-slate-700 active:scale-95 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
