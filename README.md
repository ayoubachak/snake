# Snake Game

A modern, mobile-first browser-based Snake Game built with React and Vite.

## Features

- Classic Snake gameplay with canvas rendering
- Multiple difficulty levels (speed, board size, obstacle density)
- Multiple themes (light/dark, retro, neon, etc.)
- AI gameplay with path visualization
- Mobile-first design with responsive controls
- Modern UI with smooth animations and transitions
- Local high score storage

## Technologies Used

- React 18 with TypeScript
- Vite for fast development and optimized builds
- Tailwind CSS for styling
- Zustand for state management
- Framer Motion for animations
- React Router for navigation
- Howler for sound effects

## Getting Started

### Prerequisites

- Node.js (v16.0.0 or later)
- npm (v7.0.0 or later)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Game Controls

### Desktop
- Arrow keys to control snake direction
- Space to pause/resume game
- Enter to select menu items

### Mobile
- Swipe gestures to change direction
- On-screen controls for direction
- Tap to select menu items

## Project Structure

- `/src/components/game` - Game-specific components
- `/src/components/ui` - Reusable UI components
- `/src/hooks` - Custom React hooks
- `/src/store` - Zustand state management
- `/src/utils` - Helper functions
- `/src/services` - Game services (AI, scoring, etc.)
- `/src/pages` - Main application pages
- `/src/assets` - Static assets (images, sounds)

## License

MIT
