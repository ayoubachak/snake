import { useState } from 'react';
import { motion } from 'framer-motion';

interface GameOverModalProps {
  score: number;
  onNewGame: () => void;
  onMainMenu: () => void;
  onSaveScore: (initials: string) => void;
}

const GameOverModal = ({ score, onNewGame, onMainMenu, onSaveScore }: GameOverModalProps) => {
  const [initials, setInitials] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [error, setError] = useState('');
  
  const handleSubmit = () => {
    if (!initials.trim()) {
      setError('Please enter your initials');
      return;
    }
    
    if (initials.length > 3) {
      setError('Maximum 3 characters allowed');
      return;
    }
    
    onSaveScore(initials.toUpperCase());
    setShowForm(false);
  };
  
  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <h2 className="text-3xl font-bold text-red-500 mb-4 text-center">Game Over!</h2>
        
        <div className="text-center mb-8">
          <p className="text-gray-300 text-lg">Your score:</p>
          <p className="text-5xl font-bold text-green-500">{score}</p>
        </div>
        
        {showForm ? (
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">Enter your initials:</h3>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={3}
                className="bg-gray-700 text-white px-4 py-3 rounded-lg text-center text-xl uppercase w-full"
                value={initials}
                onChange={(e) => {
                  setInitials(e.target.value);
                  setError('');
                }}
                placeholder="AAA"
              />
              <motion.button
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
              >
                Save
              </motion.button>
            </div>
            {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
          </div>
        ) : (
          <div className="text-center mb-6 text-green-400">
            Score saved successfully!
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            className="bg-green-600 text-white py-3 px-4 rounded-lg font-semibold"
            onClick={onNewGame}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            New Game
          </motion.button>
          
          <motion.button
            className="bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold"
            onClick={onMainMenu}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Main Menu
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GameOverModal; 