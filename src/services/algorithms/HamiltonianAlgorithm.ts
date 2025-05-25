import { Coordinates, Direction } from '../../store/gameStore';
import { PathfindingAlgorithm, PathfindingUtils } from './PathfindingAlgorithm';
import { AStarAlgorithm } from './AStarAlgorithm'; // Import A* for fallback

export interface HamiltonianConfig {
  shortcutThreshold: number; // % of board size (as distance) where shortcuts are considered (default: 33)
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
  private lastChosenPathForViz: Coordinates[] = []; // For getPath()

  constructor(config?: Partial<HamiltonianConfig>) {
    this.config = {
      shortcutThreshold: config?.shortcutThreshold ?? 33 
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
    
    this.generateHamiltonianCycle();
    
    if (snake.length > 0) {
      const head = snake[0];
      const headKey = `${head.x},${head.y}`;
      if (this.hamiltonianCycle.has(headKey)) {
        this.currentCycleIndex = this.hamiltonianCycle.get(headKey)!;
      }
    }
    this.lastChosenPathForViz = [];
  }

  update(
    snake: Coordinates[], 
    food: Coordinates, 
    obstacles: Coordinates[]
  ): void {
    this.snake = [...snake];
    this.food = { ...food };
    this.obstacles = [...obstacles]; // Obstacles could change, might need to regen cycle if so
    
    if (snake.length > 0) {
      const head = snake[0];
      const headKey = `${head.x},${head.y}`;
      if (this.hamiltonianCycle.has(headKey)) {
        this.currentCycleIndex = this.hamiltonianCycle.get(headKey)!;
      }
    }
    // If obstacles change significantly, consider regenerating the cycle.
    // For now, assume obstacles are static after init for this algorithm's cycle.
  }

  private isCellValidForCycle(x: number, y: number): boolean {
    if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize) return false;
    if (this.obstacles.some(obs => obs.x === x && obs.y === y)) return false;
    return true;
  }

  private generateEvenSizeCycle(cycle: Coordinates[]): void {
    for (let y = 0; y < this.boardSize; y++) {
      if (y % 2 === 0) {
        for (let x = 0; x < this.boardSize; x++) {
          if (this.isCellValidForCycle(x,y)) cycle.push({ x, y });
        }
      } else {
        for (let x = this.boardSize - 1; x >= 0; x--) {
          if (this.isCellValidForCycle(x,y)) cycle.push({ x, y });
        }
      }
    }
  }

  private generateOddSizeCycle(cycle: Coordinates[]): void {
    // Fill all rows except the last one with boustrophedon
    for (let y = 0; y < this.boardSize - 1; y++) {
      if (y % 2 === 0) {
        // Even rows: left to right (except last column)
        for (let x = 0; x < this.boardSize - 1; x++) {
          if (this.isCellValidForCycle(x,y)) cycle.push({ x, y });
        }
      } else {
        // Odd rows: right to left (except last column)
        for (let x = this.boardSize - 2; x >= 0; x--) {
          if (this.isCellValidForCycle(x,y)) cycle.push({ x, y });
        }
      }
    }
    // Add the rightmost column going down
    for (let y = 0; y < this.boardSize - 1; y++) {
      if (this.isCellValidForCycle(this.boardSize - 1, y)) cycle.push({ x: this.boardSize - 1, y });
    }
    // Add the bottom row going left
    for (let x = this.boardSize - 1; x >= 0; x--) {
      if (this.isCellValidForCycle(x, this.boardSize - 1)) cycle.push({ x, y: this.boardSize - 1 });
    }
  }
  
  private generateHamiltonianCycle(): void {
    this.cycle = [];
    this.hamiltonianCycle.clear();
    
    const tempCycle: Coordinates[] = [];
    if (this.boardSize % 2 === 0) {
      this.generateEvenSizeCycle(tempCycle);
    } else {
      this.generateOddSizeCycle(tempCycle);
    }
    
    this.cycle = tempCycle;
    
    for (let i = 0; i < this.cycle.length; i++) {
      const pos = this.cycle[i];
      this.hamiltonianCycle.set(`${pos.x},${pos.y}`, i);
    }

    if (this.cycle.length === 0 && (this.boardSize * this.boardSize - this.obstacles.length) > 0) {
        console.warn("Hamiltonian cycle generation resulted in an empty cycle despite available cells.");
    }
    // console.log(`Generated Hamiltonian-like path with ${this.cycle.length} cells for ${this.boardSize}x${this.boardSize} board with ${this.obstacles.length} obstacles.`);
  }

  getPath(): Coordinates[] {
    return this.lastChosenPathForViz;
  }
  
  getVisualizationData(): Record<string, any> {
    return {
      hamiltonianCycle: this.cycle // Full (potentially fragmented) cycle pattern
    };
  }

  private isCellSafeForMove(cell: Coordinates | null, snake: Coordinates[]): boolean {
    if (!cell) return false;
    // Check bounds and obstacles
    if (!this.isCellValidForCycle(cell.x, cell.y)) return false;

    // Check snake body (excluding tail, as it will move)
    for (let i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === cell.x && snake[i].y === cell.y) return false;
    }
    return true;
  }

  private fallbackToAStarOrDefault(head: Coordinates, snake: Coordinates[]): {nextPos: Coordinates | null, path: Coordinates[]} {
    this.lastChosenPathForViz = [];
    // 1. Try A* to food
    const aStar = new AStarAlgorithm({ heuristicWeight: 1.0 });
    aStar.initialize(this.boardSize, snake, this.food, this.obstacles);
    // findPath on AStarAlgorithm now returns only Coordinates[] | null
    const aStarPathToFood = aStar.findPath(head, this.food); 

    if (aStarPathToFood && aStarPathToFood.length > 0) {
        const aStarNextPos = aStarPathToFood[0];
        if (this.isCellSafeForMove(aStarNextPos, snake)) {
            this.lastChosenPathForViz = aStarPathToFood;
            return {nextPos: aStarNextPos, path: aStarPathToFood};
        }
    }

    // 2. Try any safe neighbor (randomly)
    const safeNeighbors = PathfindingUtils.getNeighbors(head, this.boardSize, snake, this.obstacles)
                                      .filter(n => this.isCellSafeForMove(n, snake));

    if (safeNeighbors.length > 0) {
        const randomSafeNeighbor = safeNeighbors[Math.floor(Math.random() * safeNeighbors.length)];
        this.lastChosenPathForViz = [randomSafeNeighbor];
        return {nextPos: randomSafeNeighbor, path: [randomSafeNeighbor]};
    }
    
    // 3. No safe moves - try to follow raw cycle if possible, even if unsafe (last ditch)
    if (this.cycle.length > 0 && this.hamiltonianCycle.has(`${head.x},${head.y}`)) {
         const fallbackCycleIndex = (this.hamiltonianCycle.get(`${head.x},${head.y}`)! + 1) % this.cycle.length;
         const lastDitchPos = this.cycle[fallbackCycleIndex];
         this.lastChosenPathForViz = [lastDitchPos];
         return {nextPos: lastDitchPos, path: [lastDitchPos]}; // Might be unsafe
    }

    // console.error("Hamiltonian Fallback: No safe moves found. Snake is trapped.");
    this.lastChosenPathForViz = [{x: head.x +1, y: head.y}]; // Default right, likely crash
    return {nextPos: {x: head.x + 1, y: head.y}, path: this.lastChosenPathForViz}; 
  }
  
  getNextDirection(snake: Coordinates[], _currentDirection: Direction): Direction {
    this.lastChosenPathForViz = []; // Clear previous path
    const head = snake[0];
    if (!head) return 'RIGHT'; 

    if (this.cycle.length === 0) {
        const fallback = this.fallbackToAStarOrDefault(head, snake);
        return PathfindingUtils.getDirectionFromPositions(head, fallback.nextPos ? fallback.nextPos : {x: head.x +1, y: head.y});
    }

    const headKey = `${head.x},${head.y}`;
    if (!this.hamiltonianCycle.has(headKey)) {
        // console.warn("Snake head not on Hamiltonian cycle. Attempting recovery.");
        const fallback = this.fallbackToAStarOrDefault(head, snake);
        return PathfindingUtils.getDirectionFromPositions(head, fallback.nextPos ? fallback.nextPos : {x: head.x +1, y: head.y});
    }
    this.currentCycleIndex = this.hamiltonianCycle.get(headKey)!; 

    let chosenNextPos: Coordinates | null = null;
    let chosenPath: Coordinates[] = [];

    const shortcutAttempt = this.findShortcutToFood(); // This returns a single coordinate or null
    if (shortcutAttempt) {
      // If findShortcutToFood found a direct path (e.g. via findDirectPathToFood)
      // it should return the first step. We need the path for visualization.
      // Let's assume findShortcutToFood is modified or we re-calculate path if it's just a coord.
      // For now, if shortcutAttempt is just a coordinate:
      if (this.isCellSafeForMove(shortcutAttempt, snake)) {
        chosenNextPos = shortcutAttempt;
        // To get the path for shortcut, we'd ideally have findShortcutToFood return it
        // or recalculate it here if it's just the next step.
        // For simplicity, if it's a shortcut, the path is just that step for now.
        const directPathToShortcut = this.findDirectPathToFood(head, chosenNextPos);
        chosenPath = directPathToShortcut ? directPathToShortcut : [chosenNextPos];
      }
    }
    
    if (!chosenNextPos) {
      // Follow the Hamiltonian cycle
      for (let i = 1; i <= Math.min(5, this.cycle.length); i++) {
          const potentialNextIndex = (this.currentCycleIndex + i) % this.cycle.length;
          const potentialPos = this.cycle[potentialNextIndex];
          if (this.isCellSafeForMove(potentialPos, snake)) {
              chosenNextPos = potentialPos;
              // Construct path for cycle following
              chosenPath = [];
              for (let j = 0; j < Math.min(10, this.cycle.length); j++) {
                  chosenPath.push(this.cycle[(this.currentCycleIndex + 1 + j) % this.cycle.length]);
              }
              break;
          }
      }
    }

    if (!chosenNextPos) {
        // console.warn("Hamiltonian: Cycle/Shortcut move unsafe or not found. Falling back.");
        const fallback = this.fallbackToAStarOrDefault(head, snake);
        chosenNextPos = fallback.nextPos;
        chosenPath = fallback.path; // Path from fallback
    }
    
    this.lastChosenPathForViz = chosenPath;

    if (!chosenNextPos) { // Should be handled by fallback, but as absolute safety
        // console.error("Hamiltonian: No move could be decided. Defaulting RIGHT.");
        this.lastChosenPathForViz = [{x: head.x + 1, y: head.y}];
        return 'RIGHT';
    }

    return PathfindingUtils.getDirectionFromPositions(head, chosenNextPos);
  }
  
  findPath(): Coordinates[] | null { // This method is not really used by AISnake for Hamiltonian
    return this.lastChosenPathForViz.length > 0 ? this.lastChosenPathForViz : null;
  }
  
  // ... (keep existing findShortcutToFood, findDirectPathToFood, isShortcutSafe, canReachTailAfterShortcut, getEmptyNeighbors)
  // Ensure findDirectPathToFood returns Coordinates[] | null
  // Ensure isShortcutSafe, canReachTailAfterShortcut, getEmptyNeighbors are robust.

  private findShortcutToFood(): Coordinates | null {
    if (this.snake.length === 0 || !this.food) return null;
    
    const head = this.snake[0];
    
    if (this.isShortcutSafe(head, this.food)) {
      const directPath = this.findDirectPathToFood(head, this.food);
      if (directPath && directPath.length > 0) {
        return directPath[0]; // Return first step of direct path
      }
    }
    
    // Original logic for following cycle if shortcut not taken is in getNextDirection
    // This function now purely decides if a shortcut *step* is available.
    return null; 
  }
  
  private findDirectPathToFood(start: Coordinates, foodTarget: Coordinates): Coordinates[] | null {
    const queue: { pos: Coordinates; path: Coordinates[] }[] = [{ pos: start, path: [] }];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);
    
    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;
      
      if (pos.x === foodTarget.x && pos.y === foodTarget.y) {
        return path; // Path to food (list of intermediate steps)
      }
      
      // Get neighbors, ensuring they are safe to move to (not snake body part other than tail, not obstacle)
      const neighbors = PathfindingUtils.getNeighbors(pos, this.boardSize, 
        path.length > 0 ? [start, ...path] : [start], // Simulate snake moving along path
        this.obstacles
      );
      
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(neighborKey) && this.isCellSafeForMove(neighbor, [start, ...path])) { // Check safety considering current path as snake
          visited.add(neighborKey);
          const newPath = [...path, neighbor];
          queue.push({
            pos: neighbor,
            path: newPath
          });
        }
      }
    }
    return null; 
  }
  
  private isShortcutSafe(head: Coordinates, foodTarget: Coordinates): boolean {
    const directDistance = Math.abs(head.x - foodTarget.x) + Math.abs(head.y - foodTarget.y);
    const maxShortcutDistance = Math.floor(this.boardSize * (this.config.shortcutThreshold / 100));
    
    if (directDistance === 0) return false; // Already at food
    if (directDistance > maxShortcutDistance && maxShortcutDistance > 0) { // maxShortcutDistance can be 0 if boardSize or threshold is small
      return false;
    }
    
    const boardCells = this.boardSize * this.boardSize;
    const snakeLength = this.snake.length;
    const fillRatio = snakeLength / boardCells;
    
    if (fillRatio > 0.7) { // More conservative: was 0.6
      return false;
    }
    
    const estimatedLengthAfterEating = snakeLength + 1; // Assume food gives 1 length
    const remainingSpace = boardCells - estimatedLengthAfterEating - this.obstacles.length;
    
    if (remainingSpace < boardCells * 0.20) { // Increased safety margin: was 0.1
      return false;
    }
    
    return this.canReachTailAfterShortcut(foodTarget);
  }
  
  private canReachTailAfterShortcut(foodTarget: Coordinates): boolean {
    if (this.snake.length < 2) return true; 
    
    // Simulate snake after eating food
    const tempSnake: Coordinates[] = [foodTarget, ...this.snake.slice(0, this.snake.length -1)];
    const newHead = tempSnake[0];
    const newTail = tempSnake[tempSnake.length - 1];

    // Try to find a path from the new head to the new tail's vicinity
    // This check ensures the snake doesn't cut itself off from its tail
    const aStar = new AStarAlgorithm({ heuristicWeight: 1.0 });
    aStar.initialize(this.boardSize, tempSnake, newTail, this.obstacles); // Target tail
    const pathToTail = aStar.findPath(newHead, newTail);

    return pathToTail !== null && pathToTail.length > 0;
  }
}