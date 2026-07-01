export interface Question {
  id: number;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  specialLevel?: number;
}

export interface PlayerScore {
  id: string;
  name: string;
  prizeWon: number;
  correctAnswersCount: number;
  date: string;
}

export interface GameState {
  playerName: string;
  currentLevel: number; // 0 to 14 (representing the 15 levels of the ladder)
  hasGameStarted: boolean;
  isGameOver: boolean;
  hasWonMillion: boolean;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  isAnswerSubmitted: boolean;
  timeRemaining: number;
  lifelines: {
    callFriend: boolean; // available if true
    askAudience: boolean; // available if true
    fiftyFifty: boolean; // available if true
    changeQuestion: boolean; // available if true
  };
  fiftyFiftyHidden: ('A' | 'B' | 'C' | 'D')[];
  lifelineActive: 'callFriend' | 'askAudience' | null;
  friendResponse: string | null;
  audienceVotes: { A: number; B: number; C: number; D: number } | null;
  usedChangeQuestionThisTurn: boolean;
  prizeHistory: number[];
}
