import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore, Difficulty, Theme } from '../store/gameStore';

const Settings = () => {
  const navigate = useNavigate();
  const { 
    difficulty, 
    boardSize, 
    theme,
    soundEnabled,
    setDifficulty,
    setBoardSize,
    setTheme,
    toggleSound 
  } = useGameStore();

  const difficulties: { value: Difficulty; label: string }[] = [
    { value: 'EASY', label: 'Easy' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HARD', label: 'Hard' },
    { value: 'EXTREME', label: 'Extreme' },
  ];

  const themes: { value: Theme; label: string }[] = [
    { value: 'CLASSIC', label: 'Classic' },
    { value: 'DARK', label: 'Dark' },
    { value: 'RETRO', label: 'Retro' },
    { value: 'NEON', label: 'Neon' },
  ];

  const boardSizes = [10, 15, 20, 25, 30];

  return (
    <motion.div
      className="min-h-screen bg-gray-900 text-white p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-green-500">Settings</h1>
          <button
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
            onClick={() => navigate('/')}
          >
            Back to Menu
          </button>
        </div>

        <div className="space-y-8">
          {/* Difficulty */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Difficulty</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {difficulties.map((item) => (
                <motion.button
                  key={item.value}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    difficulty === item.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setDifficulty(item.value)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.label}
                </motion.button>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-400">
              {difficulty === 'EASY' && 'Slower speed, no obstacles'}
              {difficulty === 'MEDIUM' && 'Medium speed, few obstacles'}
              {difficulty === 'HARD' && 'Fast speed, more obstacles'}
              {difficulty === 'EXTREME' && 'Very fast, many obstacles'}
            </div>
          </div>

          {/* Board Size */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Board Size</h2>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {boardSizes.map((size) => (
                <motion.button
                  key={size}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    boardSize === size
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setBoardSize(size)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {size}x{size}
                </motion.button>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-400">
              {boardSize <= 15 && 'Smaller board, more challenging'}
              {boardSize > 15 && boardSize <= 25 && 'Standard board size'}
              {boardSize > 25 && 'Larger board, more space to maneuver'}
            </div>
          </div>

          {/* Theme */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Theme</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {themes.map((item) => (
                <motion.button
                  key={item.value}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    theme === item.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setTheme(item.value)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Sound */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Sound</h2>
            <motion.button
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                soundEnabled
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-300'
              }`}
              onClick={toggleSound}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </motion.button>
          </div>
        </div>

        <div className="mt-12 mb-6">
          <motion.button
            className="w-full py-4 px-6 text-xl font-semibold rounded-lg 
                      bg-gradient-to-r from-green-500 to-green-700 text-white
                      hover:from-green-600 hover:to-green-800
                      focus:ring-4 focus:ring-green-500 focus:ring-opacity-50
                      transform transition-all duration-300 ease-out
                      shadow-lg hover:shadow-xl"
            onClick={() => navigate('/game')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Start Game with These Settings
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings; 