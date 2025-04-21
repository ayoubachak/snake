import { Coordinates } from '../../store/gameStore';
import { PathfindingAlgorithm } from './PathfindingAlgorithm';
import { AStarAlgorithm } from './AStarAlgorithm';
import { HamiltonianAlgorithm } from './HamiltonianAlgorithm';

export type Algorithm = 'astar' | 'bfs' | 'greedy' | 'dijkstra' | 'hamiltonian';

export interface AlgorithmConfig {
  heuristicWeight?: number;
  shortcutThreshold?: number;
}

export class AlgorithmFactory {
  static createAlgorithm(
    algorithm: Algorithm,
    boardSize: number,
    snake: Coordinates[],
    food: Coordinates,
    obstacles: Coordinates[],
    config?: AlgorithmConfig
  ): PathfindingAlgorithm {
    let pathfinder: PathfindingAlgorithm;
    
    switch (algorithm) {
      case 'astar':
        pathfinder = new AStarAlgorithm({ 
          heuristicWeight: config?.heuristicWeight ?? 1.0 
        });
        break;
        
      case 'hamiltonian':
        pathfinder = new HamiltonianAlgorithm({ 
          shortcutThreshold: (config?.shortcutThreshold ?? 33) / 100 // Convert from percentage
        });
        break;
        
      // Future implementations will go here
      // case 'bfs':
      // case 'greedy':
      // case 'dijkstra':
        
      default:
        // Default to A* if algorithm is not implemented yet
        pathfinder = new AStarAlgorithm({ 
          heuristicWeight: config?.heuristicWeight ?? 1.0 
        });
    }
    
    // Initialize the algorithm with the current game state
    pathfinder.initialize(boardSize, snake, food, obstacles);
    
    return pathfinder;
  }
} 