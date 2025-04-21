import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Howl } from 'howler';
import GameControls from '../components/game/GameControls';
import GameOverModal from '../components/game/GameOverModal';

const Game = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [showGameOver, setShowGameOver] = useState(false);
  
  // Game state from store
  const {
    snake,
    food,
    obstacles,
    direction,
    score,
    gameStatus,
    difficulty,
    boardSize,
    theme,
    soundEnabled,
    moveSnake,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    setDirection,
    addHighScore,
    animationInProgress,
  } = useGameStore();
  
  // Theme settings
  const themes = {
    CLASSIC: {
      background: '#000000',
      snake: '#00FF00',
      food: '#FF0000',
      obstacles: '#888888',
      gridLines: '#333333',
    },
    DARK: {
      background: '#111111',
      snake: '#4CAF50',
      food: '#F44336',
      obstacles: '#757575',
      gridLines: '#212121',
    },
    RETRO: {
      background: '#003366',
      snake: '#FFCC00',
      food: '#FF6633',
      obstacles: '#666699',
      gridLines: '#004488',
    },
    NEON: {
      background: '#0D0221',
      snake: '#39FF14',
      food: '#FF00FF',
      obstacles: '#3E065F',
      gridLines: '#1E0555',
    },
  };
  
  const currentTheme = themes[theme];
  
  // Sound effects
  const sounds = {
    eat: new Howl({ src: ['/src/assets/sounds/eat.mp3'], volume: 0.5 }),
    gameOver: new Howl({ src: ['/src/assets/sounds/game-over.mp3'], volume: 0.5 }),
    move: new Howl({ src: ['/src/assets/sounds/move.mp3'], volume: 0.2 }),
  };
  
  // Add animation frame tracker
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const cellSize = useRef<number>(0);
  
  // Game loop with animation
  useEffect(() => {
    let gameLoop: number;
    
    if (gameStatus === 'RUNNING') {
      const speed = {
        EASY: 150,
        MEDIUM: 120,
        HARD: 90,
        EXTREME: 70,
      }[difficulty];
      
      gameLoop = window.setInterval(() => {
        // If animation is still in progress, don't move yet
        if (!animationRef.current) {
          moveSnake();
          if (soundEnabled) {
            sounds.move.play();
          }
          
          // Start animation
          startSnakeAnimation();
        }
      }, speed);
    }
    
    return () => {
      if (gameLoop) clearInterval(gameLoop);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [gameStatus, difficulty, moveSnake, soundEnabled]);
  
  // Snake animation function
  const startSnakeAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const animate = (time: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }
      
      const deltaTime = time - lastTimeRef.current;
      const animationSpeed = 8; // Higher = faster animation
      const animationComplete = updateSnakeAnimation(deltaTime / animationSpeed);
      
      if (!animationComplete) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        lastTimeRef.current = 0;
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };
  
  // Update snake segment positions for animation
  const updateSnakeAnimation = (delta: number): boolean => {
    let allSegmentsComplete = true;
    
    const snakeCopy = [...snake];
    
    // Update each segment's animated position
    snakeCopy.forEach((segment, i) => {
      if (segment.animX === undefined || segment.animY === undefined || 
          segment.prevX === undefined || segment.prevY === undefined) {
        // Initialize animation properties if not set
        segment.animX = segment.x;
        segment.animY = segment.y;
        segment.prevX = segment.x;
        segment.prevY = segment.y;
        return;
      }
      
      // Calculate target position
      const targetX = segment.x;
      const targetY = segment.y;
      
      // Current animated position
      let currentX = segment.animX;
      let currentY = segment.animY;
      
      // If not at target position, continue animation
      if (Math.abs(currentX - targetX) > 0.01 || Math.abs(currentY - targetY) > 0.01) {
        // Ease toward target position
        currentX += (targetX - currentX) * delta;
        currentY += (targetY - currentY) * delta;
        
        // Update segment
        segment.animX = currentX;
        segment.animY = currentY;
        
        allSegmentsComplete = false;
      } else {
        // Snap to final position when close enough
        segment.animX = targetX;
        segment.animY = targetY;
      }
    });
    
    // Update the store with animated positions
    if (!allSegmentsComplete) {
      // This is just to trigger re-render, not to update the store
      forceRender(prev => prev + 1);
    }
    
    return allSegmentsComplete;
  };
  
  // Add state to force render
  const [, forceRender] = useState(0);
  
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus === 'RUNNING') {
        switch (e.key) {
          case 'ArrowUp':
            setDirection('UP');
            break;
          case 'ArrowDown':
            setDirection('DOWN');
            break;
          case 'ArrowLeft':
            setDirection('LEFT');
            break;
          case 'ArrowRight':
            setDirection('RIGHT');
            break;
        }
      }
      
      // Space to pause/resume
      if (e.key === ' ' || e.key === 'Spacebar') {
        if (gameStatus === 'RUNNING') {
          pauseGame();
        } else if (gameStatus === 'PAUSED') {
          resumeGame();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, setDirection, pauseGame, resumeGame]);
  
  // Draw game on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Improved canvas sizing for desktop/web views
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Better sizing logic for different screen sizes
    let canvasSize;
    if (viewportWidth >= 1200) {
      // Large desktop - use fixed larger size
      canvasSize = Math.min(600, viewportHeight * 0.8);
    } else if (viewportWidth >= 768) {
      // Desktop/tablet - use percentage of viewport with minimum
      canvasSize = Math.min(
        Math.max(viewportWidth * 0.5, 450),
        viewportHeight * 0.75
      );
    } else {
      // Mobile - use most of the screen width
      canvasSize = Math.min(
        Math.max(viewportWidth * 0.9, 300),
        viewportHeight * 0.6
      );
    }
    
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
    
    // Add slight glow effect to food
    const foodGlow = ctx.createRadialGradient(
      foodX, foodY, 0,
      foodX, foodY, cellSizeValue
    );
    foodGlow.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    foodGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = foodGlow;
    ctx.fillRect(
      food.x * cellSizeValue - cellSizeValue/2, 
      food.y * cellSizeValue - cellSizeValue/2, 
      cellSizeValue * 2, 
      cellSizeValue * 2
    );
    
    // Draw snake with animation
    snake.forEach((segment, index) => {
      // Check if this is the head
      if (index === 0) {
        // IMPROVED HEAD RENDERING - Draw head as a circle with eyes
        console.log("Rendering head:", segment);
        
        // CRUCIAL FIX: Use exact coordinates from head position, NOT animation values
        const headCenterX = (segment.x + 0.5) * cellSizeValue;
        const headCenterY = (segment.y + 0.5) * cellSizeValue;
        const headRadius = cellSizeValue * 0.6; // Slightly larger than half a cell
        
        // Draw head outer glow
        ctx.beginPath();
        ctx.arc(headCenterX, headCenterY, headRadius + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // White glow
        ctx.fill();
        
        // Draw head main circle
        ctx.beginPath();
        ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
        
        // Create radial gradient for the head
        const headGradient = ctx.createRadialGradient(
          headCenterX, headCenterY, 0,
          headCenterX, headCenterY, headRadius
        );
        headGradient.addColorStop(0, shadeColor(currentTheme.snake, 30));
        headGradient.addColorStop(1, currentTheme.snake);
        ctx.fillStyle = headGradient;
        ctx.fill();
        
        // Draw eyes based on direction
        ctx.fillStyle = '#000000';
        const eyeRadius = cellSizeValue * 0.15;
        let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
        
        // Calculate eye positions based on direction and head center
        const eyeOffset = headRadius * 0.5;
        
        switch (direction) {
          case 'UP':
            leftEyeX = headCenterX - eyeOffset;
            leftEyeY = headCenterY - eyeOffset * 0.5;
            rightEyeX = headCenterX + eyeOffset;
            rightEyeY = headCenterY - eyeOffset * 0.5;
            break;
          case 'DOWN':
            leftEyeX = headCenterX - eyeOffset;
            leftEyeY = headCenterY + eyeOffset * 0.5;
            rightEyeX = headCenterX + eyeOffset;
            rightEyeY = headCenterY + eyeOffset * 0.5;
            break;
          case 'LEFT':
            leftEyeX = headCenterX - eyeOffset * 0.5;
            leftEyeY = headCenterY - eyeOffset;
            rightEyeX = headCenterX - eyeOffset * 0.5;
            rightEyeY = headCenterY + eyeOffset;
            break;
          case 'RIGHT':
          default:
            leftEyeX = headCenterX + eyeOffset * 0.5;
            leftEyeY = headCenterY - eyeOffset;
            rightEyeX = headCenterX + eyeOffset * 0.5;
            rightEyeY = headCenterY + eyeOffset;
            break;
        }
        
        // Draw the eyes
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Get animated position (or use actual position if animation properties not set)
        const animX = segment.animX !== undefined ? segment.animX : segment.x;
        const animY = segment.animY !== undefined ? segment.animY : segment.y;
        
        // Calculate position based on animation
        const segX = animX * cellSizeValue;
        const segY = animY * cellSizeValue;
        
        // For body segments, create a subtle gradient based on position
        const bodyGradient = ctx.createLinearGradient(
          segX, segY,
          segX + cellSizeValue, segY + cellSizeValue
        );
        
        // Make segments slightly different shade based on position
        const shade = index % 2 === 0 ? 10 : -10;
        bodyGradient.addColorStop(0, shadeColor(currentTheme.snake, shade));
        bodyGradient.addColorStop(1, currentTheme.snake);
        
        ctx.fillStyle = bodyGradient;
        
        // Draw rounded corners for body segments
        const radius = cellSizeValue / 5;
        roundRect(
          ctx,
          segX, 
          segY, 
          cellSizeValue, 
          cellSizeValue,
          radius
        );
      }
    });
    
    // Draw a trail effect behind the snake
    if (gameStatus === 'RUNNING' && snake.length > 1) {
      const lastSegment = snake[snake.length - 1];
      const prevLastX = lastSegment.prevX !== undefined ? lastSegment.prevX : lastSegment.x;
      const prevLastY = lastSegment.prevY !== undefined ? lastSegment.prevY : lastSegment.y;
      
      ctx.fillStyle = `${currentTheme.snake}33`; // 33 is 20% opacity in hex
      ctx.fillRect(
        prevLastX * cellSizeValue, 
        prevLastY * cellSizeValue, 
        cellSizeValue, 
        cellSizeValue
      );
    }
    
    // Check for game over state
    if (gameStatus === 'GAME_OVER' && !showGameOver) {
      if (soundEnabled) {
        sounds.gameOver.play();
      }
      setShowGameOver(true);
    }
    
  }, [snake, food, obstacles, direction, gameStatus, boardSize, theme, currentTheme, showGameOver, soundEnabled]);
  
  // Helper function to shade colors
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
  
  // Helper function to draw rounded rectangles
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  };
  
  // Handle food eaten effect
  useEffect(() => {
    if (score > 0 && score % 10 === 0 && gameStatus === 'RUNNING') {
      if (soundEnabled) {
        sounds.eat.play();
      }
    }
  }, [score, gameStatus, soundEnabled]);
  
  // Start new game
  const handleStartGame = () => {
    setShowGameOver(false);
    startGame();
    setShowControls(false);
  };
  
  // Handle screen resize - with improved sizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Better sizing logic for different screen sizes
      let canvasSize;
      if (viewportWidth >= 1200) {
        // Large desktop - use fixed larger size
        canvasSize = Math.min(600, viewportHeight * 0.8);
      } else if (viewportWidth >= 768) {
        // Desktop/tablet - use percentage of viewport with minimum
        canvasSize = Math.min(
          Math.max(viewportWidth * 0.5, 450),
          viewportHeight * 0.75
        );
      } else {
        // Mobile - use most of the screen width
        canvasSize = Math.min(
          Math.max(viewportWidth * 0.9, 300),
          viewportHeight * 0.6
        );
      }
      
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      
      // Update cell size reference
      cellSize.current = canvasSize / boardSize;
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [boardSize]);
  
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen p-4 md:p-6 lg:p-8 bg-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-7xl flex flex-col items-center">
        <div className="flex justify-between items-center w-full mb-4 md:mb-6 lg:mb-8 md:px-8">
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
            onClick={() => gameStatus === 'RUNNING' ? pauseGame() : resumeGame()}
          >
            {gameStatus === 'RUNNING' ? 'Pause' : 'Resume'}
          </button>
        </div>
        
        <div className="relative mx-auto md:shadow-2xl md:rounded-xl overflow-hidden lg:mt-4">
          <canvas 
            ref={canvasRef} 
            className="border-2 border-gray-700 rounded-lg shadow-lg md:rounded-xl"
          />
          
          {gameStatus === 'IDLE' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 rounded-lg">
              <h2 className="text-3xl font-bold text-green-500 mb-4">
                Snake Game
              </h2>
              <button
                className="px-6 py-3 bg-green-600 text-white text-xl font-semibold rounded-lg hover:bg-green-700 transition"
                onClick={handleStartGame}
              >
                Start Game
              </button>
            </div>
          )}
          
          {gameStatus === 'PAUSED' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 rounded-lg">
              <h2 className="text-3xl font-bold text-yellow-500 mb-4">
                Game Paused
              </h2>
              <button
                className="px-6 py-3 bg-yellow-600 text-white text-xl font-semibold rounded-lg hover:bg-yellow-700 transition"
                onClick={resumeGame}
              >
                Resume Game
              </button>
            </div>
          )}
        </div>
        
        {/* Mobile controls */}
        {gameStatus === 'RUNNING' && (
          <GameControls onDirectionChange={setDirection} />
        )}
      </div>
      
      {/* Game over modal */}
      {showGameOver && (
        <GameOverModal
          score={score}
          onNewGame={() => {
            setShowGameOver(false);
            startGame();
          }}
          onMainMenu={() => {
            resetGame();
            navigate('/');
          }}
          onSaveScore={addHighScore}
        />
      )}
    </motion.div>
  );
};

export default Game; 