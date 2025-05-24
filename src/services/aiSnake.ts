import { Coordinates, Direction } from '../store/gameStore';
import { AlgorithmFactory, Algorithm } from './algorithms/AlgorithmFactory';
import { PathfindingAlgorithm } from './algorithms/PathfindingAlgorithm';

// Configuration interface for AISnake
interface AISnakeConfig {
  heuristicWeight?: number; // For A* algorithm, weight of heuristic (default: 1.0)
  shortcutThreshold?: number; // For Hamiltonian, % of board size where shortcuts are always safe (default: 33)
}

export class AISnake {
  private config: AISnakeConfig;
  private pathfinder: PathfindingAlgorithm;
  
  constructor(
    boardSize: number, 
    snake: Coordinates[], 
    food: Coordinates, 
    obstacles: Coordinates[], 
    algorithm: Algorithm = 'astar',
    config?: AISnakeConfig
  ) {
    // Set default config values if not provided
    this.config = {
      heuristicWeight: config?.heuristicWeight ?? 1.0,
      shortcutThreshold: config?.shortcutThreshold ?? 33
    };
    
    // Create the appropriate algorithm implementation
    this.pathfinder = AlgorithmFactory.createAlgorithm(
      algorithm,
      boardSize,
      snake,
      food,
      obstacles,
      this.config
    );
  }

  // Update AI state with new game state
  public update(snake: Coordinates[], food: Coordinates, obstacles: Coordinates[]): void {
    // Update the pathfinder with new state
    this.pathfinder.update(snake, food, obstacles);
  }

  // Get next direction based on calculated path
  public getNextDirection(snake: Coordinates[]): Direction {
    const currentDirection = this.getCurrentDirection(snake);
    return this.pathfinder.getNextDirection(snake, currentDirection);
  }

  // Helper to get current direction based on snake position
  private getCurrentDirection(snake: Coordinates[]): Direction {
    if (snake.length < 2) return 'RIGHT'; // Default
    
    const head = snake[0];
    const neck = snake[1];
    
    if (head.x < neck.x) return 'LEFT';
    if (head.x > neck.x) return 'RIGHT';
    if (head.y < neck.y) return 'UP';
    if (head.y > neck.y) return 'DOWN';
    
    return 'RIGHT'; // Default
  }

  // Get current path for visualization
  public getPath(): Coordinates[] {
    return this.pathfinder.getPath();
  }
  
  // Get Hamiltonian cycle for visualization
  public getHamiltonianCycle(): Coordinates[] {
    const visualizationData = this.pathfinder.getVisualizationData();
    return visualizationData.hamiltonianCycle || [];
  }
}