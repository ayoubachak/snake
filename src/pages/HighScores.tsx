import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

const HighScores = () => {
  const navigate = useNavigate();
  const { highScores } = useGameStore();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'text-green-400';
      case 'MEDIUM':
        return 'text-yellow-400';
      case 'HARD':
        return 'text-orange-400';
      case 'EXTREME':
        return 'text-red-400';
      default:
        return 'text-white';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-900 text-white p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-green-500">High Scores</h1>
          <button
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
            onClick={() => navigate('/')}
          >
            Back to Menu
          </button>
        </div>

        {highScores.length > 0 ? (
          <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="py-4 px-2 md:px-4 text-left">#</th>
                  <th className="py-4 px-2 md:px-4 text-left">Player</th>
                  <th className="py-4 px-2 md:px-4 text-right">Score</th>
                  <th className="py-4 px-2 md:px-4 text-center">Difficulty</th>
                  <th className="py-4 px-2 md:px-4 text-right hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {highScores.map((score, index) => (
                  <motion.tr
                    key={index}
                    className={`border-b border-gray-700 ${
                      index === 0 ? 'bg-gray-700 bg-opacity-30' : ''
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.05,
                      duration: 0.2,
                    }}
                  >
                    <td className="py-3 px-2 md:px-4 font-medium">
                      {index + 1}
                    </td>
                    <td className="py-3 px-2 md:px-4 font-bold">
                      {score.initials}
                    </td>
                    <td className="py-3 px-2 md:px-4 text-right font-mono text-green-500 font-bold">
                      {score.score}
                    </td>
                    <td className={`py-3 px-2 md:px-4 text-center ${getDifficultyColor(score.difficulty)}`}>
                      {score.difficulty.charAt(0) + score.difficulty.slice(1).toLowerCase()}
                    </td>
                    <td className="py-3 px-2 md:px-4 text-right hidden md:table-cell text-gray-400">
                      {formatDate(score.date)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <h2 className="text-xl text-gray-400 mb-4">No scores yet</h2>
            <p className="text-gray-500 mb-6">
              Play a game to set your first high score!
            </p>
            <motion.button
              className="px-6 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition"
              onClick={() => navigate('/game')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Game
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default HighScores; 