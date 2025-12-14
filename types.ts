export enum GameMode {
  PRACTICE = 'PRACTICE', // Endless random questions
  STORY = 'STORY', // AI generated word problems
}

export enum MathOperator {
  ADD = '+',
  SUBTRACT = '-',
}

export interface MathProblem {
  id: string;
  numA: number;
  numB: number;
  operator: MathOperator;
  answer: number;
  visualEmoji: string; // e.g., '🍎'
  storyText?: string; // Only for Story mode
}

export interface AIStoryResponse {
  story: string;
  numA: number;
  numB: number;
  operator: string;
  answer: number;
  emoji: string;
}
