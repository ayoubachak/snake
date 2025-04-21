import { Coordinates, Direction } from '../../store/gameStore';
import { PathfindingAlgorithm, PathfindingUtils } from './PathfindingAlgorithm';

export interface HamiltonianConfig {
  shortcutThreshold: number; // Threshold for taking shortcuts (default: 0.5)
}

export class HamiltonianAlgorithm implements PathfindingAlgorithm {
  private boardSize: number = 0;
  private snake: Coordinates[] = [];
  private food: Coordinates = { x: 0, y: 0 };
  private obstacles: Coordinates[] = [];
  private cycle: Coordinates[] = [];
  private hamiltonianCycle: Map<string, number> = new Map(); // Maps coordinates to cycle index
  private currentCycleIndex: number = 0;
  private config: HamiltonianConfig;
  
  constructor(config?: Partial<HamiltonianConfig>) {
    this.config = {
      shortcutThreshold: config?.shortcutThreshold ?? 0.5
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
    
    // Generate the Hamiltonian cycle
    this.generateHamiltonianCycle();
    
    // Find current position in cycle
    if (snake.length > 0) {
      const head = snake[0];
      const headKey = `${head.x},${head.y}`;
      if (this.hamiltonianCycle.has(headKey)) {
        this.currentCycleIndex = this.hamiltonianCycle.get(headKey)!;
      }
    }
  }
  
  update(
    snake: Coordinates[], 
    food: Coordinates, 
    obstacles: Coordinates[]
  ): void {
    this.snake = [...snake];
    this.food = { ...food };
    this.obstacles = [...obstacles];
    
    // Update current position in cycle if snake has moved
    if (snake.length > 0) {
      const head = snake[0];
      const headKey = `${head.x},${head.y}`;
      if (this.hamiltonianCycle.has(headKey)) {
        this.currentCycleIndex = this.hamiltonianCycle.get(headKey)!;
      }
    }
  }
  
  getPath(): Coordinates[] {
    return this.cycle;
  }
  
  getVisualizationData(): Record<string, any> {
    // Return the full Hamiltonian cycle for visualization
    return {
      hamiltonianCycle: this.cycle
    };
  }
  
  getNextDirection(snake: Coordinates[], currentDirection: Direction): Direction {
    if (snake.length === 0 || this.cycle.length === 0) {
      return PathfindingUtils.getRandomDirection(
        snake[0], 
        snake, 
        this.boardSize, 
        this.obstacles
      );
    }
    
    const head = snake[0];
    let nextPos: Coordinates;
    
    // Check if we can safely take a shortcut to the food
    const shortcut = this.findShortcutToFood();
    if (shortcut) {
      nextPos = shortcut;
    } else {
      // Follow the Hamiltonian cycle
      const nextIndex = (this.currentCycleIndex + 1) % this.cycle.length;
      nextPos = this.cycle[nextIndex];
    }
    
    return PathfindingUtils.getDirectionFromPositions(head, nextPos);
  }
  
  findPath(start: Coordinates, goal: Coordinates): Coordinates[] | null {
    // For Hamiltonian, we don't use direct pathfinding to the food
    // Instead, we follow the cycle with potential shortcuts
    return null;
  }
  
  // Private methods
  private generateHamiltonianCycle(): void {
    // Clear existing cycle data
    this.cycle = [];
    this.hamiltonianCycle.clear();
    
    // Check if board size is even
    if (this.boardSize % 2 !== 0) {
      console.warn('Hamiltonian cycle works best with even-sized boards');
    }
    
    // Generate a simple Hamiltonian cycle for a grid
    // Using the "boustrophedon" pattern (like plowing a field)
    
    // Start at (0,0)
    const cycle: Coordinates[] = [];
    
    // First row: go all the way right
    for (let x = 0; x < this.boardSize; x++) {
      cycle.push({ x, y: 0 });
    }
    
    // Last column: go all the way down except last cell
    for (let y = 1; y < this.boardSize - 1; y++) {
      cycle.push({ x: this.boardSize - 1, y });
    }
    
    // Go through remaining rows in a snake pattern
    for (let y = this.boardSize - 1; y > 0; y--) {
      if ((this.boardSize - y) % 2 === 1) {
        // Go left
        for (let x = this.boardSize - 2; x >= 0; x--) {
          cycle.push({ x, y });
        }
      } else {
        // Go right
        for (let x = 0; x < this.boardSize - 1; x++) {
          cycle.push({ x, y });
        }
      }
    }
    
    // Build the lookup map for O(1) index lookups
    for (let i = 0; i < cycle.length; i++) {
      const pos = cycle[i];
      this.hamiltonianCycle.set(`${pos.x},${pos.y}`, i);
    }
    
    this.cycle = cycle;
  }
  
  private findShortcutToFood(): Coordinates | null {
    if (this.snake.length === 0 || !this.food) return null;
    
    const head = this.snake[0];
    const headKey = `${head.x},${head.y}`;
    const foodKey = `${this.food.x},${this.food.y}`;
    
    // If food is not on the cycle, no shortcut possible
    if (!this.hamiltonianCycle.has(foodKey)) {
      return null;
    }
    
    // Get indices in the cycle
    const headIndex = this.hamiltonianCycle.get(headKey)!;
    const foodIndex = this.hamiltonianCycle.get(foodKey)!;
    
    // Check if a shortcut is possible
    if (this.isShortcutSafe(head, this.food)) {
      // Get possible moves from current position
      const neighbors = PathfindingUtils.getNeighbors(
        head, 
        this.boardSize, 
        this.snake, 
        this.obstacles
      );
      
      // Find the neighbor that's closest to the food in the cycle
      let bestNeighbor: Coordinates | null = null;
      let bestDistance = Infinity;
      
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (this.hamiltonianCycle.has(neighborKey)) {
          const neighborIndex = this.hamiltonianCycle.get(neighborKey)!;
          
          // Calculate cycle distance (may wrap around)
          let distance = (foodIndex - neighborIndex + this.cycle.length) % this.cycle.length;
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestNeighbor = neighbor;
          }
        }
      }
      
      return bestNeighbor;
    }
    
    // Follow the regular cycle: get the next position
    const nextIndex = (headIndex + 1) % this.cycle.length;
    return this.cycle[nextIndex];
  }
  
  private isShortcutSafe(head: Coordinates, food: Coordinates): boolean {
    // Don't take shortcuts if snake is too short
    const safeThreshold = Math.floor(this.boardSize * this.boardSize * this.config.shortcutThreshold);
    if (this.snake.length < safeThreshold) {
      return false;
    }
    
    const headKey = `${head.x},${head.y}`;
    const foodKey = `${food.x},${food.y}`;
    
    // Get indices in the cycle
    const headIndex = this.hamiltonianCycle.get(headKey)!;
    const foodIndex = this.hamiltonianCycle.get(foodKey)!;
    
    // Calculate forward distance in cycle
    const cycleDistance = (foodIndex - headIndex + this.cycle.length) % this.cycle.length;
    
    // Check if there are any snake segments between head and food in the cycle
    for (let i = 1; i < this.snake.length; i++) {
      const segment = this.snake[i];
      const segmentKey = `${segment.x},${segment.y}`;
      
      if (this.hamiltonianCycle.has(segmentKey)) {
        const segmentIndex = this.hamiltonianCycle.get(segmentKey)!;
        
        // Check if segment is between head and food in the cycle
        const distToSegment = (segmentIndex - headIndex + this.cycle.length) % this.cycle.length;
        
        if (distToSegment < cycleDistance) {
          // A segment is in the way, not safe to shortcut
          return false;
        }
      }
    }
    
    // Safe to take a shortcut
    return true;
  }
} 