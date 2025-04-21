import { Coordinates, Direction } from '../../store/gameStore';
import { PathfindingAlgorithm, PathfindingUtils } from './PathfindingAlgorithm';

type Node = {
  x: number;
  y: number;
  g: number; // Cost from start to current node
  h: number; // Heuristic (estimated cost from current to goal)
  f: number; // Total cost (g + h)
  parent: Node | null;
};

export interface AStarConfig {
  heuristicWeight: number; // Weight for the heuristic (default: 1.0)
}

export class AStarAlgorithm implements PathfindingAlgorithm {
  private boardSize: number = 0;
  private snake: Coordinates[] = [];
  private food: Coordinates = { x: 0, y: 0 };
  private obstacles: Coordinates[] = [];
  private path: Coordinates[] = [];
  private pathIndex: number = 0;
  private config: AStarConfig;
  
  constructor(config?: Partial<AStarConfig>) {
    this.config = {
      heuristicWeight: config?.heuristicWeight ?? 1.0
    };
  }
  
  initialize(
    boardSize: number, 
    snake: Coordinates[], 
    food: Coordinates, 
    obstacles: Coordinates[]
  ): void {
    this.boardSize = boardSize;
    this.snake = [...snake];
    this.food = { ...food };
    this.obstacles = [...obstacles];
    this.calculatePath();
  }
  
  update(
    snake: Coordinates[], 
    food: Coordinates, 
    obstacles: Coordinates[]
  ): void {
    this.snake = [...snake];
    this.food = { ...food };
    this.obstacles = [...obstacles];
    this.calculatePath();
  }
  
  getPath(): Coordinates[] {
    return [...this.path];
  }
  
  getVisualizationData(): Record<string, any> {
    // A* doesn't have any additional visualization data
    return {};
  }
  
  getNextDirection(snake: Coordinates[], currentDirection: Direction): Direction {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      // No path available, use random direction
      return PathfindingUtils.getRandomDirection(
        snake[0], 
        snake, 
        this.boardSize, 
        this.obstacles
      );
    }
    
    const head = snake[0];
    const nextPos = this.path[this.pathIndex];
    
    // Increment path index for next call
    this.pathIndex++;
    
    // Determine direction based on position difference
    return PathfindingUtils.getDirectionFromPositions(head, nextPos);
  }
  
  findPath(start: Coordinates, goal: Coordinates): Coordinates[] | null {
    // Initialize open and closed lists
    const openList: Node[] = [];
    const closedList: Set<string> = new Set();

    // Create start node
    const startNode: Node = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start, goal),
      f: this.heuristic(start, goal),
      parent: null,
    };

    // Add start node to open list
    openList.push(startNode);

    // Main loop
    while (openList.length > 0) {
      // Find node with lowest f value
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift() as Node;
      
      // Add to closed list
      closedList.add(`${current.x},${current.y}`);

      // Check if we've reached the goal
      if (current.x === goal.x && current.y === goal.y) {
        // Reconstruct path
        const path: Coordinates[] = [];
        let curNode: Node | null = current;
        
        while (curNode !== null) {
          path.unshift({ x: curNode.x, y: curNode.y });
          curNode = curNode.parent;
        }
        
        // Remove the first node (it's the current position)
        path.shift();
        
        return path;
      }

      // Get neighbors
      const neighbors = PathfindingUtils.getNeighbors(
        { x: current.x, y: current.y },
        this.boardSize,
        this.snake,
        this.obstacles
      );

      for (const neighbor of neighbors) {
        // Skip if neighbor is in closed list
        if (closedList.has(`${neighbor.x},${neighbor.y}`)) {
          continue;
        }

        // Calculate g value (cost from start to this neighbor)
        const gScore = current.g + 1;

        // Check if this neighbor is in open list
        const existingNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);

        if (!existingNode) {
          // Not in open list, add it
          const newNode: Node = {
            x: neighbor.x,
            y: neighbor.y,
            g: gScore,
            h: this.heuristic(neighbor, goal),
            f: gScore + this.heuristic(neighbor, goal),
            parent: current,
          };
          openList.push(newNode);
        } else if (gScore < existingNode.g) {
          // This path is better, update the node
          existingNode.g = gScore;
          existingNode.f = gScore + existingNode.h;
          existingNode.parent = current;
        }
      }
    }

    // No path found
    return null;
  }
  
  // Private methods
  private heuristic(a: Coordinates, b: Coordinates): number {
    return PathfindingUtils.manhattanDistance(a, b, this.config.heuristicWeight);
  }
  
  private calculatePath(): void {
    if (this.snake.length === 0) return;
    
    const head = this.snake[0];
    const pathToFood = this.findPath(head, this.food);
    
    if (pathToFood && pathToFood.length > 0) {
      this.path = pathToFood;
      this.pathIndex = 0;
    } else {
      // No path to food, find a safe move
      const safeMove = this.findSafeMove();
      if (safeMove) {
        this.path = [safeMove];
        this.pathIndex = 0;
      } else {
        // No safe moves available, clear path
        this.path = [];
      }
    }
  }
  
  private findSafeMove(): Coordinates | null {
    if (this.snake.length === 0) return null;
    
    const head = this.snake[0];
    const possibleMoves = PathfindingUtils.getNeighbors(
      head, 
      this.boardSize, 
      this.snake, 
      this.obstacles
    );
    
    if (possibleMoves.length === 0) {
      return null;
    }
    
    // Prefer moves that maximize distance from the snake's body
    return possibleMoves.reduce((safest, move) => {
      let minDistanceToSnake = Number.MAX_SAFE_INTEGER;
      
      // Calculate minimum distance to any snake segment
      for (let i = 1; i < this.snake.length; i++) {
        const segment = this.snake[i];
        const distance = this.heuristic(move, segment);
        minDistanceToSnake = Math.min(minDistanceToSnake, distance);
      }
      
      // Get current safest move's minimum distance
      let currentMinDistance = Number.MAX_SAFE_INTEGER;
      if (safest) {
        for (let i = 1; i < this.snake.length; i++) {
          const segment = this.snake[i];
          const distance = this.heuristic(safest, segment);
          currentMinDistance = Math.min(currentMinDistance, distance);
        }
      }
      
      return minDistanceToSnake > currentMinDistance ? move : safest;
    }, possibleMoves[0]);
  }
} 