import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore, Coordinates } from '../store/gameStore';
import { AISnake } from '../services/aiSnake';
import { Algorithm } from '../services/algorithms/AlgorithmFactory';

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
    boardSize,
    theme,
    moveSnake,
    startGame,
    pauseGame,
    resetGame,
    setDirection,
    direction,
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
  const cellSize = useRef<number>(0);
  
  // Add algorithm choices
  const [algorithm, setAlgorithm] = useState<Algorithm>('astar');

  // Add a debug state to help track the snake
  const [debugInfo, setDebugInfo] = useState<{
    snakeLength: number;
    headPosition: { x: number, y: number } | null;
  }>({ snakeLength: 0, headPosition: null });

  // State to store Hamiltonian cycle for visualization
  const [hamiltonianCycle, setHamiltonianCycle] = useState<Coordinates[]>([]);
  
  // Advanced configuration states
  const [showPath, setShowPath] = useState<boolean>(true);
  const [showHamiltonianCycle, setShowHamiltonianCycle] = useState<boolean>(true);
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(true);
  const [aStarHeuristicWeight, setAStarHeuristicWeight] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<'algorithm' | 'speed' | 'visualization'>('algorithm');
  const [shortcutThreshold, setShortcutThreshold] = useState<number>(33); // % of board size where shortcuts are always safe
  const [pathColor, setPathColor] = useState<string>(currentTheme.path);
  const [cycleOpacity, setCycleOpacity] = useState<number>(0.1);

  // Add effect to track snake changes for debugging
  useEffect(() => {
    if (snake.length > 0) {
      setDebugInfo({
        snakeLength: snake.length,
        headPosition: { x: snake[0].x, y: snake[0].y }
      });
    }
  }, [snake]);

  // Initialize AI snake when game starts
  useEffect(() => {
    if (isPlaying && !aiSnake) {
      const ai = new AISnake(
        boardSize, 
        snake, 
        food, 
        obstacles, 
        algorithm, 
        {
          heuristicWeight: aStarHeuristicWeight,
          shortcutThreshold: shortcutThreshold
        }
      );
      setAISnake(ai);
    }
  }, [isPlaying, boardSize, snake, food, obstacles, algorithm, aStarHeuristicWeight, shortcutThreshold]);

  // Update AI when algorithm changes
  useEffect(() => {
    if (isPlaying && aiSnake) {
      // Recreate AI snake with new algorithm
      const ai = new AISnake(
        boardSize, 
        snake, 
        food, 
        obstacles, 
        algorithm,
        {
          heuristicWeight: aStarHeuristicWeight,
          shortcutThreshold: shortcutThreshold
        }
      );
      setAISnake(ai);
      
      // Get Hamiltonian cycle for visualization if applicable
      if (algorithm === 'hamiltonian') {
        setHamiltonianCycle(ai.getHamiltonianCycle());
      } else {
        setHamiltonianCycle([]);
      }
    }
  }, [algorithm, isPlaying, boardSize, snake, food, obstacles, aStarHeuristicWeight, shortcutThreshold]);

  // Update AI when game state changes
  useEffect(() => {
    if (isPlaying && aiSnake) {
      aiSnake.update(snake, food, obstacles);
      const path = aiSnake.getPath();
      setAIPath(path);
      
      // Update Hamiltonian cycle if needed
      if (algorithm === 'hamiltonian') {
        setHamiltonianCycle(aiSnake.getHamiltonianCycle());
      }
      
      const nextDirection = aiSnake.getNextDirection(snake);
      if (nextDirection) {
        setDirection(nextDirection);
      }
    }
  }, [isPlaying, snake, food, obstacles, aiSnake, setDirection, algorithm]);

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

  // Draw game on canvas with improved snake rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Log the snake array for debugging
    console.log("Snake array in render:", snake);
    if (!snake || snake.length === 0) {
      console.warn("Empty snake array detected in render function!");
    }
    
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
    if (isPlaying && aiPath.length > 0 && showPath) {
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Start from the snake's head
      if (snake.length > 0) {
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
    }
    
    // Draw Hamiltonian cycle when using that algorithm
    if (isPlaying && algorithm === 'hamiltonian' && hamiltonianCycle.length > 0 && showHamiltonianCycle) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${cycleOpacity})`; // Configurable opacity
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      // Start from the first cell in the cycle
      const firstCell = hamiltonianCycle[0];
      ctx.moveTo(
        (firstCell.x + 0.5) * cellSizeValue,
        (firstCell.y + 0.5) * cellSizeValue
      );
      
      // Draw entire cycle
      hamiltonianCycle.forEach((point, index) => {
        if (index > 0) { // Skip first point which is where we started
          ctx.lineTo(
            (point.x + 0.5) * cellSizeValue,
            (point.y + 0.5) * cellSizeValue
          );
        }
      });
      
      // Connect back to first cell to complete the cycle
      ctx.lineTo(
        (firstCell.x + 0.5) * cellSizeValue,
        (firstCell.y + 0.5) * cellSizeValue
      );
      
      ctx.stroke();
      
      // Optionally, draw dots at each cell to make the cycle more visible
      ctx.fillStyle = `rgba(255, 255, 255, ${cycleOpacity})`;
      hamiltonianCycle.forEach(point => {
        ctx.beginPath();
        ctx.arc(
          (point.x + 0.5) * cellSizeValue,
          (point.y + 0.5) * cellSizeValue,
          cellSizeValue * 0.1, // Small dot
          0, Math.PI * 2
        );
        ctx.fill();
      });
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

    // COMPLETELY NEW APPROACH FOR SNAKE RENDERING - USING DIFFERENT SHAPES
    
    // First, render all snake body segments as squares
    if (snake.length > 1) { // Only if there are body segments
      for (let i = 1; i < snake.length; i++) {
        const segment = snake[i];
        const segX = segment.x * cellSizeValue;
        const segY = segment.y * cellSizeValue;
        
        // Body segments with alternating colors for visibility
        ctx.fillStyle = i % 2 === 0 
          ? currentTheme.snake 
          : shadeColor(currentTheme.snake, -10);
          
        ctx.fillRect(
          segX, 
          segY, 
          cellSizeValue, 
          cellSizeValue
        );
      }
    }
    
    // Now, explicitly render the head as a circle (if it exists)
    if (snake.length > 0) {
      // Explicitly log the head for debugging
      console.log("Rendering head:", snake[0]);
      console.log("Animation properties:", {
        x: snake[0].x,
        y: snake[0].y,
        animX: snake[0].animX,
        animY: snake[0].animY,
        prevX: snake[0].prevX,
        prevY: snake[0].prevY
      });
      
      const head = snake[0]; // Always treat the first element as the head
      
      // Use precise coordinates, ignoring animation values to ensure head is visible
      const headCenterX = (head.x + 0.5) * cellSizeValue;
      const headCenterY = (head.y + 0.5) * cellSizeValue;
      const headRadius = cellSizeValue * 0.6; // Slightly larger than half a cell
      
      // Draw head circle with outer glow
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
      
      // Draw eyes - position them based on direction
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
    }
    
    // Draw debug information
    if (isPlaying && debugInfo.headPosition && showDebugInfo) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '12px Arial';
      ctx.fillText(`Snake Length: ${debugInfo.snakeLength}`, 10, 20);
      ctx.fillText(`Head: (${debugInfo.headPosition.x}, ${debugInfo.headPosition.y})`, 10, 40);
      ctx.fillText(`Direction: ${direction}`, 10, 60);
      ctx.fillText(`Algorithm: ${algorithm.toUpperCase()}`, 10, 80);
    }
    
  }, [snake, food, obstacles, boardSize, currentTheme, aiPath, isPlaying, direction, debugInfo, showPath, showHamiltonianCycle, cycleOpacity, pathColor]);

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

  // Add a deeper diagnostics effect to track snake array changes
  useEffect(() => {
    if (snake.length > 0 && isPlaying) {
      console.log('Snake update:', {
        length: snake.length,
        head: snake[0],
        tail: snake[snake.length - 1],
        fullSnake: [...snake]
      });
    }
  }, [snake, isPlaying]);

  // Helper function for rendering sliders
  const renderSlider = (
    label: string, 
    value: number, 
    onChange: (value: number) => void, 
    min: number, 
    max: number, 
    step: number, 
    tooltip?: string
  ) => (
    <div className="w-full mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-gray-300 text-sm">
          {label}
          {tooltip && (
            <span 
              className="ml-1 text-gray-500 cursor-help"
              title={tooltip}
            >
              ⓘ
            </span>
          )}
        </label>
        <span className="text-white text-sm font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );

  // Helper function for rendering color pickers
  const renderColorPicker = (
    label: string, 
    value: string, 
    onChange: (value: string) => void
  ) => (
    <div className="w-full mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-gray-300 text-sm">{label}</label>
        <div className="flex items-center">
          <div 
            className="w-4 h-4 rounded-full mr-2" 
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-6"
          />
        </div>
      </div>
    </div>
  );

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
        
        {/* Enhanced AI Controls with Tabs */}
        <div className="w-full max-w-screen-xl mx-auto mt-3 bg-gray-800 p-3 rounded-lg">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700 mb-3">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === 'algorithm' 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('algorithm')}
            >
              Algorithm
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === 'speed' 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('speed')}
            >
              Speed
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === 'visualization' 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('visualization')}
            >
              Visualization
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="px-1">
            {/* Algorithm Tab */}
            {activeTab === 'algorithm' && (
              <div>
                {/* Algorithm Selection */}
                <div className="mb-4">
                  <label className="text-gray-300 block mb-2 font-medium">Algorithm Selection</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {([
                      { id: 'astar', label: 'A*', description: 'Balanced pathfinding with heuristic' },
                      { id: 'bfs', label: 'BFS', description: 'Breadth-first search, finds shortest path' },
                      { id: 'greedy', label: 'Greedy', description: 'Always moves toward food, may get trapped' },
                      { id: 'dijkstra', label: 'Dijkstra', description: 'Exhaustive search for shortest path' },
                      { id: 'hamiltonian', label: 'Hamiltonian', description: 'Guaranteed to win but slower' }
                    ] as const).map((algo) => (
                      <div 
                        key={algo.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          algorithm === algo.id
                            ? 'bg-blue-600 shadow-lg transform scale-105'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        onClick={() => setAlgorithm(algo.id)}
                      >
                        <div className="font-semibold text-white">{algo.label}</div>
                        <div className="text-xs text-gray-300 mt-1">{algo.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Algorithm-specific configuration */}
                <div className="mb-4">
                  <h3 className="text-gray-300 mb-3 font-medium">Algorithm Configuration</h3>
                  
                  {algorithm === 'astar' && (
                    <div>
                      {renderSlider(
                        "Heuristic Weight", 
                        aStarHeuristicWeight, 
                        setAStarHeuristicWeight, 
                        0.1, 
                        5.0, 
                        0.1, 
                        "Higher values make the path more direct but may not be optimal"
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        A* balances between Dijkstra (weight=0) and Greedy (weight=∞).
                        Adjust the weight to control how strongly the algorithm favors paths toward the goal.
                      </div>
                    </div>
                  )}
                  
                  {algorithm === 'hamiltonian' && (
                    <div>
                      {renderSlider(
                        "Shortcut Threshold (%)", 
                        shortcutThreshold, 
                        setShortcutThreshold, 
                        0, 
                        100, 
                        1, 
                        "% of board size where shortcuts are always considered safe"
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        The Hamiltonian algorithm creates a path that visits every cell exactly once,
                        but can take shortcuts when safe. Higher values make the AI more aggressive
                        in taking shortcuts when the snake is small.
                      </div>
                    </div>
                  )}
                  
                  {algorithm === 'greedy' && (
                    <div className="text-xs text-gray-400">
                      Greedy always chooses the move that brings it closest to the food.
                      This can be fast but may lead to trapping itself.
                    </div>
                  )}
                  
                  {algorithm === 'bfs' && (
                    <div className="text-xs text-gray-400">
                      BFS (Breadth-First Search) explores all possible paths layer by layer,
                      guaranteeing the shortest path to the food if one exists.
                    </div>
                  )}
                  
                  {algorithm === 'dijkstra' && (
                    <div className="text-xs text-gray-400">
                      Dijkstra's algorithm explores all possible paths, prioritizing the shortest ones.
                      It's very thorough but slower than other algorithms.
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Speed Tab */}
            {activeTab === 'speed' && (
              <div>
                <label className="text-gray-300 block mb-2 font-medium">Game Speed</label>
                
                {/* Visual Speed Selection */}
                <div className="grid grid-cols-7 gap-1 mb-3">
                  {([
                    { id: 'very-slow', label: 'Very Slow', ms: 300 },
                    { id: 'slow', label: 'Slow', ms: 200 },
                    { id: 'normal', label: 'Normal', ms: 150 },
                    { id: 'fast', label: 'Fast', ms: 100 },
                    { id: 'very-fast', label: 'Very Fast', ms: 50 },
                    { id: 'turbo', label: 'Turbo', ms: 25 },
                    { id: 'instant', label: 'Instant', ms: 5 }
                  ] as const).map((speedOption) => (
                    <button
                      key={speedOption.id}
                      className={`px-2 py-3 text-sm rounded-md text-white ${
                        speed === speedOption.id 
                          ? 'bg-green-600 font-semibold' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      onClick={() => setSpeed(speedOption.id)}
                    >
                      <div className="text-xs md:text-sm">{speedOption.label}</div>
                      <div className="text-xs text-gray-300 mt-1 hidden md:block">{speedOption.ms}ms</div>
                    </button>
                  ))}
                </div>
                
                {/* Speed details */}
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-white text-sm font-medium mb-1">Current Speed</h4>
                      <div className="text-green-500 text-lg font-mono">
                        {({
                          'very-slow': '300ms',
                          'slow': '200ms',
                          'normal': '150ms',
                          'fast': '100ms',
                          'very-fast': '50ms',
                          'turbo': '25ms',
                          'instant': '5ms'
                        } as const)[speed]}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Time between moves
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-white text-sm font-medium mb-1">Algorithm</h4>
                      <div className="text-blue-500 text-lg capitalize">
                        {algorithm}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Current pathfinding method
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Visualization Tab */}
            {activeTab === 'visualization' && (
              <div>
                <h3 className="text-gray-300 mb-3 font-medium">Visualization Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h4 className="text-white text-sm font-medium mb-2">Display Options</h4>
                    
                    {/* Toggle switches */}
                    <div className="space-y-2">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-gray-300 text-sm">Show Path</span>
                        <div 
                          className={`w-10 h-5 rounded-full ${showPath ? 'bg-blue-600' : 'bg-gray-600'} relative transition-colors`}
                          onClick={() => setShowPath(!showPath)}
                        >
                          <div 
                            className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${
                              showPath ? 'right-0.5' : 'left-0.5'
                            }`} 
                          />
                        </div>
                      </label>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-gray-300 text-sm">Show Hamiltonian Cycle</span>
                        <div 
                          className={`w-10 h-5 rounded-full ${showHamiltonianCycle ? 'bg-blue-600' : 'bg-gray-600'} relative transition-colors`}
                          onClick={() => setShowHamiltonianCycle(!showHamiltonianCycle)}
                        >
                          <div 
                            className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${
                              showHamiltonianCycle ? 'right-0.5' : 'left-0.5'
                            }`} 
                          />
                        </div>
                      </label>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-gray-300 text-sm">Show Debug Info</span>
                        <div 
                          className={`w-10 h-5 rounded-full ${showDebugInfo ? 'bg-blue-600' : 'bg-gray-600'} relative transition-colors`}
                          onClick={() => setShowDebugInfo(!showDebugInfo)}
                        >
                          <div 
                            className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${
                              showDebugInfo ? 'right-0.5' : 'left-0.5'
                            }`} 
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h4 className="text-white text-sm font-medium mb-2">Appearance</h4>
                    
                    {/* Color and opacity settings */}
                    <div>
                      {renderColorPicker("Path Color", pathColor, setPathColor)}
                      
                      {renderSlider(
                        "Cycle Opacity", 
                        cycleOpacity, 
                        setCycleOpacity, 
                        0.05, 
                        0.5, 
                        0.05
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AIPlay;