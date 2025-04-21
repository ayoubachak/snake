import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { AISnake } from '../services/aiSnake';

const AIPlay = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'very-slow' | 'slow' | 'normal' | 'fast' | 'very-fast' | 'turbo' | 'instant'>('normal');
  const [aiSnake, setAISnake] = useState<AISnake | null>(null);
  const [aiPath, setAIPath] = useState<{ x: number; y: number }[]>([]);
  const [showGameOver, setShowGameOver] = useState(false);
  
  // Game state from store
  const {
    snake,
    food,
    obstacles,
    score,
    gameStatus,
    difficulty,
    boardSize,
    theme,
    soundEnabled,
    moveSnake,
    startGame,
    pauseGame,
    resetGame,
    setDirection,
  } = useGameStore();
  
  // Theme settings
  const themes = {
    CLASSIC: {
      background: '#000000',
      snake: '#00FF00',
      food: '#FF0000',
      obstacles: '#888888',
      gridLines: '#333333',
      path: '#0088FF',
    },
    DARK: {
      background: '#111111',
      snake: '#4CAF50',
      food: '#F44336',
      obstacles: '#757575',
      gridLines: '#212121',
      path: '#03A9F4',
    },
    RETRO: {
      background: '#003366',
      snake: '#FFCC00',
      food: '#FF6633',
      obstacles: '#666699',
      gridLines: '#004488',
      path: '#33CCFF',
    },
    NEON: {
      background: '#0D0221',
      snake: '#39FF14',
      food: '#FF00FF',
      obstacles: '#3E065F',
      gridLines: '#1E0555',
      path: '#00FFFF',
    },
  };
  
  const currentTheme = themes[theme];
  
  // Add animation frame tracker
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const cellSize = useRef<number>(0);
  
  // Add state to force render
  const [, forceRender] = useState(0);
  
  // Add algorithm choices
  const [algorithm, setAlgorithm] = useState<'astar' | 'bfs' | 'greedy' | 'dijkstra'>('astar');

  // Initialize AI snake when game starts
  useEffect(() => {
    if (isPlaying && !aiSnake) {
      const ai = new AISnake(boardSize, snake, food, obstacles, algorithm);
      setAISnake(ai);
    }
  }, [isPlaying, boardSize, snake, food, obstacles, algorithm]);

  // Update AI when game state changes
  useEffect(() => {
    if (isPlaying && aiSnake) {
      aiSnake.update(snake, food, obstacles);
      const path = aiSnake.getPath();
      setAIPath(path);
      
      const nextDirection = aiSnake.getNextDirection();
      if (nextDirection) {
        setDirection(nextDirection);
      }
    }
  }, [isPlaying, snake, food, obstacles, aiSnake, setDirection]);

  // Update AI when algorithm changes
  useEffect(() => {
    if (isPlaying && aiSnake) {
      // Recreate AI snake with new algorithm
      const ai = new AISnake(boardSize, snake, food, obstacles, algorithm);
      setAISnake(ai);
    }
  }, [algorithm, isPlaying]);

  // Game loop with speed control
  useEffect(() => {
    let gameLoop: number;
    
    if (isPlaying) {
      const speedSettings = {
        'very-slow': 300,
        'slow': 200,
        'normal': 150,
        'fast': 100,
        'very-fast': 50,
        'turbo': 25,
        'instant': 5,
      };
      
      gameLoop = window.setInterval(() => {
        moveSnake();
      }, speedSettings[speed]);
    }
    
    return () => {
      if (gameLoop) clearInterval(gameLoop);
    };
  }, [isPlaying, speed, moveSnake]);

  // Draw game on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Canvas sizing - updated for centered full screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Reserve space for controls and header (approximately 200px)
    const reservedSpace = 250;
    
    // Calculate maximum square size that fits in the viewport
    let canvasSize = Math.min(
      viewportWidth * 0.90, 
      viewportHeight - reservedSpace
    );
    
    // Set minimum size to ensure visibility
    canvasSize = Math.max(canvasSize, 300);
    
    // Set size with even values to avoid blurriness
    canvasSize = Math.floor(canvasSize);
    
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    
    // Calculate cell size
    const cellSizeValue = canvasSize / boardSize;
    cellSize.current = cellSizeValue;
    
    // Clear canvas
    ctx.fillStyle = currentTheme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = currentTheme.gridLines;
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= boardSize; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(i * cellSizeValue, 0);
      ctx.lineTo(i * cellSizeValue, canvas.height);
      ctx.stroke();
      
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, i * cellSizeValue);
      ctx.lineTo(canvas.width, i * cellSizeValue);
      ctx.stroke();
    }
    
    // Draw AI path
    if (isPlaying && aiPath.length > 0) {
      ctx.strokeStyle = currentTheme.path;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Start from the snake's head
      const head = snake[0];
      ctx.moveTo(
        (head.x + 0.5) * cellSizeValue,
        (head.y + 0.5) * cellSizeValue
      );
      
      // Draw path
      aiPath.forEach(point => {
        ctx.lineTo(
          (point.x + 0.5) * cellSizeValue,
          (point.y + 0.5) * cellSizeValue
        );
      });
      
      ctx.stroke();
    }
    
    // Draw obstacles
    ctx.fillStyle = currentTheme.obstacles;
    obstacles.forEach(({ x, y }) => {
      ctx.fillRect(x * cellSizeValue, y * cellSizeValue, cellSizeValue, cellSizeValue);
    });
    
    // Draw food
    ctx.fillStyle = currentTheme.food;
    ctx.beginPath();
    const foodX = food.x * cellSizeValue + cellSizeValue / 2;
    const foodY = food.y * cellSizeValue + cellSizeValue / 2;
    ctx.arc(foodX, foodY, cellSizeValue / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw snake
    snake.forEach((segment, index) => {
      // Get animated position
      const segX = segment.x * cellSizeValue;
      const segY = segment.y * cellSizeValue;
      
      // Draw snake body
      ctx.fillStyle = currentTheme.snake;
      
      // Head is slightly different
      if (index === 0) {
        // Create gradient for head
        const headGradient = ctx.createLinearGradient(
          segX, segY,
          segX + cellSizeValue, segY + cellSizeValue
        );
        headGradient.addColorStop(0, currentTheme.snake);
        headGradient.addColorStop(1, shadeColor(currentTheme.snake, 20));
        ctx.fillStyle = headGradient;
        
        // Draw slightly larger head
        ctx.fillRect(
          segX - 2, 
          segY - 2, 
          cellSizeValue + 4, 
          cellSizeValue + 4
        );
        
        // Draw eyes
        ctx.fillStyle = '#000000';
        const eyeSize = cellSizeValue / 6;
        const direction = snake.length > 1 
          ? getDirectionFromSegments(segment, snake[1]) 
          : 'RIGHT';
        
        let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
        
        // Position eyes based on direction
        switch (direction) {
          case 'UP':
            leftEyeX = segX + cellSizeValue / 4;
            leftEyeY = segY + cellSizeValue / 4;
            rightEyeX = segX + cellSizeValue * 3 / 4;
            rightEyeY = segY + cellSizeValue / 4;
            break;
          case 'DOWN':
            leftEyeX = segX + cellSizeValue / 4;
            leftEyeY = segY + cellSizeValue * 3 / 4;
            rightEyeX = segX + cellSizeValue * 3 / 4;
            rightEyeY = segY + cellSizeValue * 3 / 4;
            break;
          case 'LEFT':
            leftEyeX = segX + cellSizeValue / 4;
            leftEyeY = segY + cellSizeValue / 4;
            rightEyeX = segX + cellSizeValue / 4;
            rightEyeY = segY + cellSizeValue * 3 / 4;
            break;
          case 'RIGHT':
          default:
            leftEyeX = segX + cellSizeValue * 3 / 4;
            leftEyeY = segY + cellSizeValue / 4;
            rightEyeX = segX + cellSizeValue * 3 / 4;
            rightEyeY = segY + cellSizeValue * 3 / 4;
            break;
        }
        
        // Draw the eyes
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // For body segments
        ctx.fillRect(
          segX, 
          segY, 
          cellSizeValue, 
          cellSizeValue
        );
      }
    });
    
  }, [snake, food, obstacles, boardSize, currentTheme, aiPath, isPlaying]);

  // Helper functions for rendering
  const shadeColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 0 ? 0 : B) : 255)
    ).toString(16).slice(1);
  };
  
  // Determine direction between two segments
  const getDirectionFromSegments = (a: Coordinates, b: Coordinates): Direction => {
    if (a.x < b.x) return 'LEFT';
    if (a.x > b.x) return 'RIGHT';
    if (a.y < b.y) return 'UP';
    if (a.y > b.y) return 'DOWN';
    return 'RIGHT'; // default
  };

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Reserve space for controls and header
      const reservedSpace = 250;
      
      // Calculate maximum square size that fits in the viewport
      let canvasSize = Math.min(
        viewportWidth * 0.90, 
        viewportHeight - reservedSpace
      );
      
      // Set minimum size to ensure visibility
      canvasSize = Math.max(canvasSize, 300);
      
      // Set size with even values to avoid blurriness
      canvasSize = Math.floor(canvasSize);
      
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      
      cellSize.current = canvasSize / boardSize;
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [boardSize]);

  // Detect game over state
  useEffect(() => {
    if (gameStatus === 'GAME_OVER' && isPlaying) {
      setShowGameOver(true);
      setIsPlaying(false);
    }
  }, [gameStatus, isPlaying]);

  // Reset game over state when starting new game
  const handleStartGame = () => {
    setShowGameOver(false);
    resetGame();
    startGame();
    setIsPlaying(true);
  };

  // Stop AI game
  const handleStopGame = () => {
    pauseGame();
    setIsPlaying(false);
    setAISnake(null);
    setAIPath([]);
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-start min-h-screen p-2 bg-gray-900 w-full max-w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-screen-xl mx-auto flex flex-col items-center">
        <div className="flex justify-between items-center w-full mb-2 px-2">
          <button
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
            onClick={() => navigate('/')}
          >
            Main Menu
          </button>
          
          <div className="text-2xl md:text-3xl font-bold text-white">
            Score: <span className="text-green-500">{score}</span>
          </div>
          
          <button
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
            onClick={() => isPlaying ? handleStopGame() : handleStartGame()}
          >
            {isPlaying ? 'Stop AI' : 'Start AI'}
          </button>
        </div>
        
        <div className="relative mx-auto flex justify-center w-full md:shadow-2xl md:rounded-xl overflow-hidden lg:mt-4">
          <canvas 
            ref={canvasRef} 
            className="border-2 border-gray-700 rounded-lg shadow-lg md:rounded-xl"
          />
          
          {!isPlaying && !showGameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 rounded-lg">
              <h2 className="text-3xl font-bold text-blue-500 mb-4">
                AI Snake
              </h2>
              <button
                className="px-6 py-3 bg-blue-600 text-white text-xl font-semibold rounded-lg hover:bg-blue-700 transition mb-4"
                onClick={handleStartGame}
              >
                Start AI
              </button>
            </div>
          )}

          {/* Game Over UI */}
          {showGameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 rounded-lg">
              <h2 className="text-3xl font-bold text-red-500 mb-2">
                Game Over
              </h2>
              <p className="text-white text-xl mb-6">
                Score: <span className="text-green-500 font-bold">{score}</span>
              </p>
              <div className="flex space-x-4">
                <button
                  className="px-6 py-3 bg-green-600 text-white text-xl font-semibold rounded-lg hover:bg-green-700 transition"
                  onClick={handleStartGame}
                >
                  Play Again
                </button>
                <button
                  className="px-6 py-3 bg-gray-600 text-white text-xl font-semibold rounded-lg hover:bg-gray-700 transition"
                  onClick={() => navigate('/')}
                >
                  Main Menu
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* AI Controls */}
        <div className="w-full max-w-screen-xl mx-auto mt-3 bg-gray-800 p-3 rounded-lg">
          <div className="flex flex-col md:flex-row justify-between">
            {/* Algorithm Select */}
            <div className="mb-2 md:mb-0 md:mr-4">
              <label className="text-gray-300 block mb-1">Algorithm</label>
              <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
                {(['astar', 'bfs', 'greedy', 'dijkstra'] as const).map((algo) => (
                  <button
                    key={algo}
                    className={`px-2 py-1 text-sm rounded-md text-white ${
                      algorithm === algo 
                        ? 'bg-blue-600 font-semibold' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => setAlgorithm(algo)}
                  >
                    {algo === 'astar' ? 'A*' : 
                     algo === 'bfs' ? 'BFS' : 
                     algo === 'greedy' ? 'Greedy' : 'Dijkstra'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Speed Control */}
            <div>
              <label className="text-gray-300 block mb-1">Speed</label>
              <div className="grid grid-cols-3 gap-1 md:grid-cols-7">
                {(['very-slow', 'slow', 'normal', 'fast', 'very-fast', 'turbo', 'instant'] as const).map((speedOption) => (
                  <button
                    key={speedOption}
                    className={`px-2 py-1 text-sm rounded-md text-white ${
                      speed === speedOption 
                        ? 'bg-green-600 font-semibold' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => setSpeed(speedOption)}
                  >
                    {speedOption.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AIPlay;