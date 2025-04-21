import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Direction } from '../../store/gameStore';

interface GameControlsProps {
  onDirectionChange: (direction: Direction) => void;
}

const GameControls = ({ onDirectionChange }: GameControlsProps) => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  
  // Handle touch swipe for mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      
      const touch = e.touches[0];
      const diffX = touch.clientX - touchStartRef.current.x;
      const diffY = touch.clientY - touchStartRef.current.y;
      
      // Detect swipe direction (if it's more horizontal or vertical)
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 20) {
          onDirectionChange('RIGHT');
        } else if (diffX < -20) {
          onDirectionChange('LEFT');
        }
      } else {
        // Vertical swipe
        if (diffY > 20) {
          onDirectionChange('DOWN');
        } else if (diffY < -20) {
          onDirectionChange('UP');
        }
      }
      
      // Reset touch start after a successful swipe
      if (Math.abs(diffX) > 20 || Math.abs(diffY) > 20) {
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    };
    
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [onDirectionChange]);
  
  return (
    <div className="w-full mt-8 md:hidden">
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        <div className="col-start-2">
          <DirectionButton 
            direction="UP" 
            icon="↑" 
            onClick={() => onDirectionChange('UP')} 
          />
        </div>
        <div className="col-start-1">
          <DirectionButton 
            direction="LEFT" 
            icon="←" 
            onClick={() => onDirectionChange('LEFT')} 
          />
        </div>
        <div className="col-start-2">
          <DirectionButton 
            direction="DOWN" 
            icon="↓" 
            onClick={() => onDirectionChange('DOWN')} 
          />
        </div>
        <div className="col-start-3">
          <DirectionButton 
            direction="RIGHT" 
            icon="→" 
            onClick={() => onDirectionChange('RIGHT')} 
          />
        </div>
      </div>
      <div className="text-center text-gray-400 text-xs mt-2">
        Swipe or use buttons to control the snake
      </div>
    </div>
  );
};

interface DirectionButtonProps {
  direction: Direction;
  icon: string;
  onClick: () => void;
}

const DirectionButton = ({ direction, icon, onClick }: DirectionButtonProps) => {
  return (
    <motion.button
      className="w-full h-16 flex items-center justify-center rounded-lg bg-gray-800 text-white text-3xl"
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      whileHover={{ backgroundColor: '#4CAF50' }}
    >
      {icon}
    </motion.button>
  );
};

export default GameControls; 