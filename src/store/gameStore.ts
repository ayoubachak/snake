import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define types
export type Coordinates = {
  x: number;
  y: number;
  // Animation properties for smooth movement
  animX?: number; // Current animated X position
  animY?: number; // Current animated Y position
  prevX?: number; // Previous X position
  prevY?: number; // Previous Y position
};

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';

export type Theme = 'CLASSIC' | 'DARK' | 'RETRO' | 'NEON';

export type GameStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'GAME_OVER';

export type HighScore = {
  initials: string;
  score: number;
  difficulty: Difficulty;
  date: string;
};

interface GameState {
  // Game state
  snake: Coordinates[];
  food: Coordinates;
  obstacles: Coordinates[];
  direction: Direction;
  nextDirection: Direction;
  score: number;
  gameStatus: GameStatus;
  animationInProgress: boolean;
  
  // Settings
  difficulty: Difficulty;
  boardSize: number;
  theme: Theme;
  soundEnabled: boolean;
  
  // High scores
  highScores: HighScore[];
  
  // Actions
  setDirection: (direction: Direction) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  moveSnake: () => void;
  eatFood: () => void;
  gameOver: () => void;
  addHighScore: (initials: string) => void;
  
  // Settings actions
  setDifficulty: (difficulty: Difficulty) => void;
  setBoardSize: (size: number) => void;
  setTheme: (theme: Theme) => void;
  toggleSound: () => void;
}

// Game parameters based on difficulty
const difficultySettings = {
  EASY: { speed: 150, obstacleCount: 0 },
  MEDIUM: { speed: 120, obstacleCount: 5 },
  HARD: { speed: 90, obstacleCount: 10 },
  EXTREME: { speed: 70, obstacleCount: 15 },
};

// Helper to generate random coordinates
const getRandomPosition = (min: number, max: number, exclude: Coordinates[] = []): Coordinates => {
  let position: Coordinates;
  do {
    position = {
      x: Math.floor(Math.random() * (max - min)) + min,
      y: Math.floor(Math.random() * (max - min)) + min,
    };
  } while (exclude.some(pos => pos.x === position.x && pos.y === position.y));
  
  return position;
};

// Create the store
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial game state
      snake: [{ x: 5, y: 5, animX: 5, animY: 5 }],
      food: { x: 10, y: 10 },
      obstacles: [],
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
      score: 0,
      gameStatus: 'IDLE',
      animationInProgress: false,
      
      // Initial settings
      difficulty: 'MEDIUM',
      boardSize: 20,
      theme: 'CLASSIC',
      soundEnabled: true,
      
      // High scores
      highScores: [],
      
      // Actions
      setDirection: (direction) => {
        const { nextDirection } = get();
        
        // Prevent 180-degree turns
        if (
          (direction === 'UP' && nextDirection === 'DOWN') ||
          (direction === 'DOWN' && nextDirection === 'UP') ||
          (direction === 'LEFT' && nextDirection === 'RIGHT') ||
          (direction === 'RIGHT' && nextDirection === 'LEFT')
        ) {
          return;
        }
        
        set({ nextDirection: direction });
      },
      
      startGame: () => {
        const { difficulty, boardSize } = get();
        const obstacleCount = difficultySettings[difficulty].obstacleCount;
        const obstacles: Coordinates[] = [];
        
        // Generate obstacles
        if (obstacleCount > 0) {
          const initialSnake = [{ x: 5, y: 5, animX: 5, animY: 5 }];
          const initialFood = getRandomPosition(1, boardSize - 1, initialSnake);
          
          for (let i = 0; i < obstacleCount; i++) {
            obstacles.push(
              getRandomPosition(1, boardSize - 1, [...initialSnake, initialFood, ...obstacles])
            );
          }
        }
        
        set({
          snake: [{ x: 5, y: 5, animX: 5, animY: 5 }],
          food: getRandomPosition(1, boardSize - 1, [{ x: 5, y: 5 }]),
          obstacles,
          direction: 'RIGHT',
          nextDirection: 'RIGHT',
          score: 0,
          gameStatus: 'RUNNING',
          animationInProgress: false,
        });
      },
      
      pauseGame: () => set({ gameStatus: 'PAUSED' }),
      
      resumeGame: () => set({ gameStatus: 'RUNNING' }),
      
      resetGame: () => set({ 
        snake: [{ x: 5, y: 5, animX: 5, animY: 5 }],
        food: { x: 10, y: 10 },
        obstacles: [],
        direction: 'RIGHT',
        nextDirection: 'RIGHT',
        score: 0,
        gameStatus: 'IDLE',
        animationInProgress: false,
      }),
      
      moveSnake: () => {
        const { snake, nextDirection, food, obstacles, boardSize } = get();
        
        // Validate snake array at the beginning of moveSnake
        console.log("Snake at start of moveSnake:", JSON.stringify(snake, null, 2));
        
        // Update direction
        const direction = nextDirection;
        
        // Calculate new head position
        const head = { ...snake[0] };
        const prevX = head.x;
        const prevY = head.y;
        
        switch (direction) {
          case 'UP':
            head.y -= 1;
            break;
          case 'DOWN':
            head.y += 1;
            break;
          case 'LEFT':
            head.x -= 1;
            break;
          case 'RIGHT':
            head.x += 1;
            break;
        }
        
        // Add animation properties
        head.prevX = prevX;
        head.prevY = prevY;
        head.animX = prevX;
        head.animY = prevY;
        
        // Check for collisions with walls
        if (
          head.x < 0 || 
          head.y < 0 || 
          head.x >= boardSize || 
          head.y >= boardSize
        ) {
          get().gameOver();
          return;
        }
        
        // Check for collisions with self
        if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
          get().gameOver();
          return;
        }
        
        // Check for collisions with obstacles
        if (obstacles.some(obstacle => obstacle.x === head.x && obstacle.y === head.y)) {
          get().gameOver();
          return;
        }
        
        // Create new snake array
        const newSnake = [head, ...snake];
        
        // Check if food is eaten
        if (head.x === food.x && head.y === food.y) {
          console.log('Food eaten! Snake before:', [...snake]);
          get().eatFood();
          console.log('After eatFood. New head:', head, 'Snake length:', newSnake.length);
        } else {
          // Remove tail if food wasn't eaten
          newSnake.pop();
        }
        
        // Update animation properties for all segments
        newSnake.forEach((segment, i) => {
          if (i > 0) {
            segment.prevX = segment.x;
            segment.prevY = segment.y;
            segment.animX = segment.x;
            segment.animY = segment.y;
          }
        });
        
        console.log('moveSnake completed. New snake:', [...newSnake]);
        
        set({ 
          snake: newSnake, 
          direction,
          animationInProgress: true
        });
        
        // Validate the snake array has been updated correctly
        console.log("Updated snake AFTER set:", get().snake);
      },
      
      eatFood: () => {
        const { snake, obstacles, boardSize, score } = get();
        
        console.log('eatFood called. Current snake:', [...snake]);
        
        // Generate new food position
        const newFood = getRandomPosition(0, boardSize, [...snake, ...obstacles]);
        
        console.log('New food generated at:', newFood);
        
        // Increase score
        set({ 
          food: newFood,
          score: score + 10,
        });
        
        console.log('eatFood completed. Score:', score + 10);
      },
      
      gameOver: () => {
        set({ gameStatus: 'GAME_OVER' });
      },
      
      addHighScore: (initials) => {
        const { score, difficulty, highScores } = get();
        
        const newHighScore: HighScore = {
          initials,
          score,
          difficulty,
          date: new Date().toISOString(),
        };
        
        // Add new score and sort by score (descending)
        const newHighScores = [...highScores, newHighScore]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10); // Keep only top 10
        
        set({ highScores: newHighScores });
      },
      
      // Settings actions
      setDifficulty: (difficulty) => set({ difficulty }),
      
      setBoardSize: (boardSize) => set({ boardSize }),
      
      setTheme: (theme) => set({ theme }),
      
      toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),
    }),
    {
      name: 'snake-game-storage', // Name for localStorage
      partialize: (state) => ({ 
        highScores: state.highScores,
        difficulty: state.difficulty,
        boardSize: state.boardSize,
        theme: state.theme,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
); 