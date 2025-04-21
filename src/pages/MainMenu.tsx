import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MainMenu = () => {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'start', label: 'Start Game', path: '/game' },
    { id: 'high-scores', label: 'High Scores', path: '/high-scores' },
    { id: 'ai-play', label: 'AI Play', path: '/ai-play' },
    { id: 'settings', label: 'Settings', path: '/settings' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.5 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-gray-900 to-black"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
    >
      <h1 className="text-5xl md:text-7xl font-bold mb-4 text-green-500 tracking-wider">
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          SNAKE
        </motion.span>
        <motion.span
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-white"
        >
          GAME
        </motion.span>
      </h1>

      <motion.div
        className="w-full max-w-md mt-10 space-y-4"
        variants={containerVariants}
      >
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            className="w-full py-4 px-6 text-xl font-semibold rounded-lg 
                      bg-gradient-to-r from-green-500 to-green-700 text-white
                      hover:from-green-600 hover:to-green-800
                      focus:ring-4 focus:ring-green-500 focus:ring-opacity-50
                      transform transition-all duration-300 ease-out
                      shadow-lg hover:shadow-xl"
            onClick={() => navigate(item.path)}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {item.label}
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        className="absolute bottom-4 text-gray-400 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        Use arrow keys or swipe to navigate the game
      </motion.div>
    </motion.div>
  );
};

export default MainMenu; 