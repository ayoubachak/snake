import { Coordinates, Direction } from '../../store/gameStore';

// Base interface for all pathfinding algorithms
export interface PathfindingAlgorithm {
  // Initialize the algorithm with game state
  initialize(
    boardSize: number, 
    snake: Coordinates[], 
    food: Coordinates, 
    obstacles: Coordinates[]
  ): void;
  
  // Update the algorithm with new game state
  update(
    snake: Coordinates[], 
    food: Coordinates, 
    obstacles: Coordinates[]
  ): void;
  
  // Calculate a path from start to goal
  findPath(start: Coordinates, goal: Coordinates): Coordinates[] | null;
  
  // Get the next direction for the snake to move based on algorithm's strategy
  getNextDirection(snake: Coordinates[], currentDirection: Direction): Direction;
  
  // Get the calculated path for visualization
  getPath(): Coordinates[];
  
  // Get additional visualization data (like Hamiltonian cycle)
  getVisualizationData(): Record<string, any>;
}

// Common utilities that can be shared across algorithms
export const PathfindingUtils = {
  // Manhattan distance heuristic
  manhattanDistance(a: Coordinates, b: Coordinates, weight: number = 1): number {
    return weight * (Math.abs(a.x - b.x) + Math.abs(a.y - b.y));
  },
  
  // Check if a position is valid (not a wall, obstacle, or snake body)
  isValidPosition(
    pos: Coordinates, 
    boardSize: number, 
    snake: Coordinates[], 
    obstacles: Coordinates[]
  ): boolean {
    // Check for board boundaries
    if (pos.x < 0 || pos.x >= boardSize || pos.y < 0 || pos.y >= boardSize) {
      return false;
    }

    // Check for obstacles
    if (obstacles.some(o => o.x === pos.x && o.y === pos.y)) {
      return false;
    }

    // Check for snake body (except tail which will move)
    // We exclude the tail because it will move out of the way in the next move
    for (let i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === pos.x && snake[i].y === pos.y) {
        return false;
      }
    }

    return true;
  },
  
  // Get all valid neighbors for a position
  getNeighbors(
    pos: Coordinates, 
    boardSize: number, 
    snake: Coordinates[], 
    obstacles: Coordinates[]
  ): Coordinates[] {
    const neighbors: Coordinates[] = [
      { x: pos.x, y: pos.y - 1 }, // UP
      { x: pos.x, y: pos.y + 1 }, // DOWN
      { x: pos.x - 1, y: pos.y }, // LEFT
      { x: pos.x + 1, y: pos.y }, // RIGHT
    ];

    return neighbors.filter(p => 
      PathfindingUtils.isValidPosition(p, boardSize, snake, obstacles)
    );
  },
  
  // Get direction from current position to next position
  getDirectionFromPositions(current: Coordinates, next: Coordinates): Direction {
    if (next.x < current.x) return 'LEFT';
    if (next.x > current.x) return 'RIGHT';
    if (next.y < current.y) return 'UP';
    if (next.y > current.y) return 'DOWN';
    
    // Default (should not happen)
    return 'RIGHT';
  },
  
  // Get a random valid direction as fallback
  getRandomDirection(
    head: Coordinates, 
    snake: Coordinates[], 
    boardSize: number, 
    obstacles: Coordinates[]
  ): Direction {
    const validMoves = PathfindingUtils.getNeighbors(head, boardSize, snake, obstacles);
    
    if (validMoves.length === 0) {
      // No valid moves, return current direction or make a guess
      if (snake.length > 1) {
        // Use snake's current direction as reference
        const dx = head.x - (snake[1]?.x || head.x);
        const dy = head.y - (snake[1]?.y || head.y);
        
        if (dx > 0) return 'RIGHT';
        if (dx < 0) return 'LEFT';
        if (dy > 0) return 'DOWN';
        if (dy < 0) return 'UP';
      }
      
      return 'RIGHT'; // Default
    }
    
    // Choose a random valid move
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    return PathfindingUtils.getDirectionFromPositions(head, randomMove);
  }
}; 