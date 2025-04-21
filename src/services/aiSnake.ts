import { Coordinates, Direction } from '../store/gameStore';

type Node = {
  x: number;
  y: number;
  g: number; // Cost from start to current node
  h: number; // Heuristic (estimated cost from current to goal)
  f: number; // Total cost (g + h)
  parent: Node | null;
};

type Algorithm = 'astar' | 'bfs' | 'greedy' | 'dijkstra';

export class AISnake {
  private boardSize: number;
  private obstacles: Coordinates[];
  private snake: Coordinates[];
  private food: Coordinates;
  private path: Coordinates[] = [];
  private pathIndex: number = 0;
  private algorithm: Algorithm = 'astar';

  constructor(boardSize: number, snake: Coordinates[], food: Coordinates, obstacles: Coordinates[], algorithm: Algorithm = 'astar') {
    this.boardSize = boardSize;
    this.snake = [...snake];
    this.food = { ...food };
    this.obstacles = [...obstacles];
    this.algorithm = algorithm;
    this.calculatePath();
  }

  // Manhattan distance heuristic
  private heuristic(a: Coordinates, b: Coordinates): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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

  // A* pathfinding algorithm
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
      default:
        return this.findPathAStar(start, goal);
    }
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
        // No safe moves available, keep existing path if any
        if (this.path.length === 0) {
          this.path = [];
        }
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
} 