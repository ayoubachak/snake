import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';

// Lazy loaded components
const MainMenu = lazy(() => import('./pages/MainMenu'));
const Game = lazy(() => import('./pages/Game'));
const HighScores = lazy(() => import('./pages/HighScores'));
const Settings = lazy(() => import('./pages/Settings'));
const AIPlay = lazy(() => import('./pages/AIPlay'));

// Loading component
const Loading = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-black">
    <div className="text-3xl text-green-500 font-bold">Loading...</div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans">
        <AnimatePresence mode="wait">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<MainMenu />} />
              <Route path="/game" element={<Game />} />
              <Route path="/high-scores" element={<HighScores />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/ai-play" element={<AIPlay />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </div>
    </Router>
  );
}

export default App;
