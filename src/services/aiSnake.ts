import { Coordinates, Direction } from '../store/gameStore';

type Node = {
  x: number;
  y: number;
  g: number; // Cost from start to current node
  h: number; // Heuristic (estimated cost from current to goal)
  f: number; // Total cost (g + h)
  parent: Node | null;
};

type Algorithm = 'astar' | 'bfs' | 'greedy' | 'dijkstra' | 'hamiltonian';

// Configuration interface for AISnake
interface AISnakeConfig {
  heuristicWeight?: number; // For A* algorithm, weight of heuristic (default: 1.0)
  shortcutThreshold?: number; // For Hamiltonian, % of board size where shortcuts are always safe (default: 33)
}

export class AISnake {
  private boardSize: number;
  private obstacles: Coordinates[];
  private snake: Coordinates[];
  private food: Coordinates;
  private path: Coordinates[] = [];
  private pathIndex: number = 0;
  private algorithm: Algorithm = 'astar';
  private config: AISnakeConfig;
  
  // Hamiltonian cycle related
  private hamiltonianCycle: Coordinates[] = [];
  private hamiltonianMap: Map<string, number> = new Map(); // Maps positions to index in cycle

  constructor(
    boardSize: number, 
    snake: Coordinates[], 
    food: Coordinates, 
    obstacles: Coordinates[], 
    algorithm: Algorithm = 'astar',
    config?: AISnakeConfig
  ) {
    this.boardSize = boardSize;
    this.snake = [...snake];
    this.food = { ...food };
    this.obstacles = [...obstacles];
    this.algorithm = algorithm;
    
    // Set default config values if not provided
    this.config = {
      heuristicWeight: config?.heuristicWeight ?? 1.0,
      shortcutThreshold: config?.shortcutThreshold ?? 33
    };
    
    // Initialize Hamiltonian cycle if required
    if (algorithm === 'hamiltonian') {
      this.generateHamiltonianCycle();
    }
    
    this.calculatePath();
  }

  // Manhattan distance heuristic
  private heuristic(a: Coordinates, b: Coordinates): number {
    // Apply heuristic weight to make path more or less direct
    return this.config.heuristicWeight! * (Math.abs(a.x - b.x) + Math.abs(a.y - b.y));
  }

  // Check if a position is valid (not a wall, obstacle, or snake body)
  private isValidPosition(pos: Coordinates): boolean {
    // Check for board boundaries
    if (pos.x < 0 || pos.x >= this.boardSize || pos.y < 0 || pos.y >= this.boardSize) {
      return false;
    }

    // Check for obstacles
    if (this.obstacles.some(o => o.x === pos.x && o.y === pos.y)) {
      return false;
    }

    // Check for snake body (except tail which will move)
    // We exclude the tail because it will move out of the way in the next move
    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === pos.x && this.snake[i].y === pos.y) {
        return false;
      }
    }

    return true;
  }

  // Get all valid neighbors for a position
  private getNeighbors(pos: Coordinates): Coordinates[] {
    const neighbors: Coordinates[] = [
      { x: pos.x, y: pos.y - 1 }, // UP
      { x: pos.x, y: pos.y + 1 }, // DOWN
      { x: pos.x - 1, y: pos.y }, // LEFT
      { x: pos.x + 1, y: pos.y }, // RIGHT
    ];

    return neighbors.filter(pos => this.isValidPosition(pos));
  }

  // Find path using selected algorithm
  private findPath(start: Coordinates, goal: Coordinates): Coordinates[] | null {
    switch (this.algorithm) {
      case 'astar':
        return this.findPathAStar(start, goal);
      case 'bfs':
        return this.findPathBFS(start, goal);
      case 'greedy':
        return this.findPathGreedy(start, goal);
      case 'dijkstra':
        return this.findPathDijkstra(start, goal);
      case 'hamiltonian':
        return this.findPathHamiltonian(start, goal);
      default:
        return this.findPathAStar(start, goal);
    }
  }
  
  // Generate a Hamiltonian cycle for the board
  private generateHamiltonianCycle(): void {
    // Reset the cycle and map
    this.hamiltonianCycle = [];
    this.hamiltonianMap = new Map();
    
    // For simplicity, we'll use a "zig-zag" pattern that works well for even-dimension boards
    // If dimensions are odd, we can still generate a cycle but it's more complex
    
    // Verify board dimensions are compatible
    if (this.boardSize % 2 !== 0) {
      console.warn("Hamiltonian cycle works best with even board dimensions. Using fallback strategy.");
      // We can still generate a cycle with odd dimensions, but for simplicity we'll just use a different algorithm
      this.algorithm = 'astar';
      return;
    }
    
    // Generate the "lawn-mower" pattern
    for (let y = 0; y < this.boardSize; y++) {
      if (y % 2 === 0) {
        // Even rows go left to right
        for (let x = 0; x < this.boardSize; x++) {
          this.hamiltonianCycle.push({ x, y });
        }
      } else {
        // Odd rows go right to left
        for (let x = this.boardSize - 1; x >= 0; x--) {
          this.hamiltonianCycle.push({ x, y });
        }
      }
    }
    
    // Create a lookup map for efficient position-to-index queries
    this.hamiltonianCycle.forEach((pos, index) => {
      this.hamiltonianMap.set(`${pos.x},${pos.y}`, index);
    });
    
    console.log(`Generated Hamiltonian cycle with ${this.hamiltonianCycle.length} cells`);
  }
  
  // Find path using the Hamiltonian cycle with safe shortcuts
  private findPathHamiltonian(start: Coordinates, goal: Coordinates): Coordinates[] | null {
    // If cycle isn't generated yet, generate it
    if (this.hamiltonianCycle.length === 0) {
      this.generateHamiltonianCycle();
    }
    
    // Check if we have a valid Hamiltonian cycle
    if (this.hamiltonianCycle.length === 0) {
      console.warn("No valid Hamiltonian cycle. Falling back to A*");
      return this.findPathAStar(start, goal);
    }
    
    // Find current position in the Hamiltonian cycle
    const startKey = `${start.x},${start.y}`;
    const currentIndex = this.hamiltonianMap.get(startKey);
    
    if (currentIndex === undefined) {
      console.warn("Start position not found in Hamiltonian cycle");
      return this.findPathAStar(start, goal);
    }
    
    // Find goal position in the Hamiltonian cycle
    const goalKey = `${goal.x},${goal.y}`;
    const goalIndex = this.hamiltonianMap.get(goalKey);
    
    if (goalIndex === undefined) {
      console.warn("Goal position not found in Hamiltonian cycle");
      return this.findPathAStar(start, goal);
    }
    
    // First, try to find a direct shortcut to the food
    const directPath = this.findPathBFS(start, goal);
    
    if (directPath && directPath.length > 0) {
      // Check if the shortcut is safe (won't trap the snake)
      if (this.isShortcutSafe(start, directPath)) {
        console.log("Taking safe shortcut to food");
        return directPath;
      }
    }
    
    // Otherwise, follow the Hamiltonian cycle until we reach the food
    const cyclePath: Coordinates[] = [];
    
    // If goal is ahead in the cycle, we can just go there directly
    if (goalIndex > currentIndex) {
      for (let i = currentIndex + 1; i <= goalIndex; i++) {
        cyclePath.push(this.hamiltonianCycle[i]);
      }
    } else {
      // If goal is behind in the cycle, we need to wrap around
      // First go to the end of the cycle
      for (let i = currentIndex + 1; i < this.hamiltonianCycle.length; i++) {
        cyclePath.push(this.hamiltonianCycle[i]);
      }
      // Then from start to goal
      for (let i = 0; i <= goalIndex; i++) {
        cyclePath.push(this.hamiltonianCycle[i]);
      }
    }
    
    return cyclePath;
  }
  
  // Check if a shortcut is safe (won't trap the snake)
  private isShortcutSafe(start: Coordinates, shortcutPath: Coordinates[]): boolean {
    // For a shortcut to be safe, after taking it:
    // 1. The tail must be reachable from the new head position
    // 2. The snake won't be trapped
    
    // If the snake is small relative to the board, shortcuts are generally safe
    // Use the configured threshold (default 33%)
    const safeThreshold = (this.boardSize * this.boardSize) * (this.config.shortcutThreshold! / 100);
    if (this.snake.length < safeThreshold) {
      return true;
    }
    
    // Otherwise, simulate taking the shortcut
    const simulatedHead = shortcutPath[shortcutPath.length - 1]; // Where head will be
    const tail = this.snake[this.snake.length - 1]; // Current tail
    
    // Make a copy of snake for simulation
    const snakeCopy = [...this.snake];
    
    // Move snake head to the new position
    for (let i = 0; i < shortcutPath.length; i++) {
      // Add new head
      snakeCopy.unshift(shortcutPath[i]);
      // Remove tail (snake doesn't grow)
      snakeCopy.pop();
      
      // Check if this position is valid (not hitting body)
      if (snakeCopy.slice(1).some(seg => seg.x === shortcutPath[i].x && seg.y === shortcutPath[i].y)) {
        return false; // Would hit itself
      }
    }
    
    // After simulating movement, verify that tail is reachable from new head position
    // We'll do a simple BFS search
    const visited = new Set<string>();
    const queue: Coordinates[] = [simulatedHead];
    visited.add(`${simulatedHead.x},${simulatedHead.y}`);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // If we've reached the tail, shortcut is safe
      if (current.x === tail.x && current.y === tail.y) {
        return true;
      }
      
      // Try all neighbors
      const neighbors = [
        { x: current.x, y: current.y - 1 }, // UP
        { x: current.x, y: current.y + 1 }, // DOWN
        { x: current.x - 1, y: current.y }, // LEFT
        { x: current.x + 1, y: current.y }, // RIGHT
      ];
      
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        
        // Skip if already visited
        if (visited.has(key)) continue;
        
        // Skip if out of bounds
        if (neighbor.x < 0 || neighbor.x >= this.boardSize || 
            neighbor.y < 0 || neighbor.y >= this.boardSize) {
          continue;
        }
        
        // Skip if obstacle
        if (this.obstacles.some(o => o.x === neighbor.x && o.y === neighbor.y)) {
          continue;
        }
        
        // Skip if part of simulated snake body (except tail, which is our target)
        if (snakeCopy.some(seg => 
            seg.x === neighbor.x && seg.y === neighbor.y && 
            !(seg.x === tail.x && seg.y === tail.y))) {
          continue;
        }
        
        // Add to queue and mark as visited
        queue.push(neighbor);
        visited.add(key);
      }
    }
    
    // If we've exhausted all paths and haven't found the tail, shortcut is not safe
    return false;
  }

  // A* algorithm implementation
  private findPathAStar(start: Coordinates, goal: Coordinates): Coordinates[] | null {
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
      const neighbors = this.getNeighbors({ x: current.x, y: current.y });

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

  // BFS algorithm implementation
  private findPathBFS(start: Coordinates, goal: Coordinates): Coordinates[] | null {
    const queue: Node[] = [];
    const visited: Set<string> = new Set();
    
    // Create start node
    const startNode: Node = {
      x: start.x,
      y: start.y,
      g: 0,
      h: 0,
      f: 0,
      parent: null,
    };
    
    // Add start node to queue
    queue.push(startNode);
    visited.add(`${start.x},${start.y}`);
    
    // Main loop
    while (queue.length > 0) {
      const current = queue.shift() as Node;
      
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
      const neighbors = this.getNeighbors({ x: current.x, y: current.y });
      
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        
        // Skip if visited
        if (visited.has(key)) {
          continue;
        }
        
        // Mark as visited
        visited.add(key);
        
        // Add to queue
        const newNode: Node = {
          x: neighbor.x,
          y: neighbor.y,
          g: current.g + 1,
          h: 0,
          f: 0,
          parent: current,
        };
        
        queue.push(newNode);
      }
    }
    
    // No path found
    return null;
  }

  // Greedy Best-First Search algorithm implementation
  private findPathGreedy(start: Coordinates, goal: Coordinates): Coordinates[] | null {
    const openList: Node[] = [];
    const visited: Set<string> = new Set();
    
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
      // Sort by heuristic value only (greedy approach)
      openList.sort((a, b) => a.h - b.h);
      const current = openList.shift() as Node;
      
      // Mark as visited
      const key = `${current.x},${current.y}`;
      visited.add(key);
      
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
      const neighbors = this.getNeighbors({ x: current.x, y: current.y });
      
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        
        // Skip if visited
        if (visited.has(key)) {
          continue;
        }
        
        // Add to open list
        const newNode: Node = {
          x: neighbor.x,
          y: neighbor.y,
          g: current.g + 1,
          h: this.heuristic(neighbor, goal),
          f: this.heuristic(neighbor, goal), // f = h in greedy
          parent: current,
        };
        
        openList.push(newNode);
      }
    }
    
    // No path found
    return null;
  }

  // Dijkstra's algorithm implementation
  private findPathDijkstra(start: Coordinates, goal: Coordinates): Coordinates[] | null {
    const openList: Node[] = [];
    const closedList: Set<string> = new Set();
    
    // Create start node
    const startNode: Node = {
      x: start.x,
      y: start.y,
      g: 0,
      h: 0,
      f: 0,
      parent: null,
    };
    
    // Add start node to open list
    openList.push(startNode);
    
    // Main loop
    while (openList.length > 0) {
      // Sort by g value only (Dijkstra approach)
      openList.sort((a, b) => a.g - b.g);
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
      const neighbors = this.getNeighbors({ x: current.x, y: current.y });
      
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
            h: 0,
            f: gScore, // f = g in Dijkstra
            parent: current,
          };
          openList.push(newNode);
        } else if (gScore < existingNode.g) {
          // This path is better, update the node
          existingNode.g = gScore;
          existingNode.f = gScore;
          existingNode.parent = current;
        }
      }
    }
    
    // No path found
    return null;
  }

  // Fallback strategy when no path to food is available
  private findSafeMove(): Coordinates | null {
    const head = this.snake[0];
    const possibleMoves = this.getNeighbors(head);
    
    if (possibleMoves.length === 0) {
      return null;
    }
    
    // If using Hamiltonian, first try to find the next position in the cycle
    if (this.algorithm === 'hamiltonian' && this.hamiltonianCycle.length > 0) {
      const headKey = `${head.x},${head.y}`;
      const currentIndex = this.hamiltonianMap.get(headKey);
      
      if (currentIndex !== undefined) {
        // Get next position in cycle
        const nextIndex = (currentIndex + 1) % this.hamiltonianCycle.length;
        const nextPos = this.hamiltonianCycle[nextIndex];
        
        // Check if it's a valid move
        if (possibleMoves.some(move => move.x === nextPos.x && move.y === nextPos.y)) {
          return nextPos;
        }
      }
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

  // Calculate the path to the food
  public calculatePath(): void {
    const head = this.snake[0];
    
    // For Hamiltonian, we need special handling
    if (this.algorithm === 'hamiltonian') {
      // Regenerate cycle if needed
      if (this.hamiltonianCycle.length === 0) {
        this.generateHamiltonianCycle();
      }
      
      const pathToFood = this.findPath(head, this.food);
      if (pathToFood && pathToFood.length > 0) {
        this.path = pathToFood;
        this.pathIndex = 0;
        return;
      }
    } else {
      // For other algorithms, standard approach
      const pathToFood = this.findPath(head, this.food);
      if (pathToFood && pathToFood.length > 0) {
        this.path = pathToFood;
        this.pathIndex = 0;
        return;
      }
    }
    
    // No path to food or algorithm needs fallback
    const safeMove = this.findSafeMove();
    if (safeMove) {
      this.path = [safeMove];
      this.pathIndex = 0;
    } else {
      // No safe moves available, keep existing path if any
      if (this.path.length === 0) {
        this.path = [];
      }
    }
  }

  // Update AI state with new game state
  public update(snake: Coordinates[], food: Coordinates, obstacles: Coordinates[]): void {
    this.snake = [...snake];
    this.food = { ...food };
    this.obstacles = [...obstacles];
    this.calculatePath();
  }

  // Get next direction based on calculated path
  public getNextDirection(): Direction {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      // For Hamiltonian, when no explicit path, follow the cycle
      if (this.algorithm === 'hamiltonian' && this.hamiltonianCycle.length > 0) {
        const head = this.snake[0];
        const headKey = `${head.x},${head.y}`;
        const currentIndex = this.hamiltonianMap.get(headKey);
        
        if (currentIndex !== undefined) {
          // Get next position in cycle
          const nextIndex = (currentIndex + 1) % this.hamiltonianCycle.length;
          const nextPos = this.hamiltonianCycle[nextIndex];
          
          // Determine direction
          if (nextPos.x < head.x) return 'LEFT';
          if (nextPos.x > head.x) return 'RIGHT';
          if (nextPos.y < head.y) return 'UP';
          if (nextPos.y > head.y) return 'DOWN';
        }
      }
      
      return this.getRandomDirection();
    }
    
    const head = this.snake[0];
    const nextPos = this.path[this.pathIndex];
    
    // Increment path index for next call
    this.pathIndex++;
    
    // Determine direction based on position difference
    if (nextPos.x < head.x) return 'LEFT';
    if (nextPos.x > head.x) return 'RIGHT';
    if (nextPos.y < head.y) return 'UP';
    if (nextPos.y > head.y) return 'DOWN';
    
    // Fallback (should not happen)
    return this.getRandomDirection();
  }

  // Get a random valid direction
  private getRandomDirection(): Direction {
    const head = this.snake[0];
    const validMoves = this.getNeighbors(head);
    
    if (validMoves.length === 0) {
      // No valid moves, return current direction
      const dx = head.x - (this.snake[1]?.x || head.x);
      const dy = head.y - (this.snake[1]?.y || head.y);
      
      if (dx > 0) return 'RIGHT';
      if (dx < 0) return 'LEFT';
      if (dy > 0) return 'DOWN';
      if (dy < 0) return 'UP';
      
      return 'RIGHT'; // Default
    }
    
    // Choose a random valid move
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    
    if (randomMove.x < head.x) return 'LEFT';
    if (randomMove.x > head.x) return 'RIGHT';
    if (randomMove.y < head.y) return 'UP';
    if (randomMove.y > head.y) return 'DOWN';
    
    return 'RIGHT'; // Default
  }

  // Get current path for visualization
  public getPath(): Coordinates[] {
    return [...this.path];
  }
  
  // Get Hamiltonian cycle for visualization
  public getHamiltonianCycle(): Coordinates[] {
    return [...this.hamiltonianCycle];
  }
} 