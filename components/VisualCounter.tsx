import React from 'react';
import { playSound } from '../services/audioService';

interface VisualCounterProps {
  count: number;
  emoji: string;
  isSubtraction?: boolean;
  faded?: boolean;
  isCelebrating?: boolean;
  // Teaching props
  highlightIndex?: number | null; // The index currently being counted (0-based)
  crossedOutCount?: number; // How many items from the end are crossed out
}

const VisualCounter: React.FC<VisualCounterProps> = ({ 
  count, 
  emoji, 
  isSubtraction = false, 
  faded = false,
  isCelebrating = false,
  highlightIndex = null,
  crossedOutCount = 0
}) => {
  
  const handleItemClick = () => {
    playSound('pop');
  };

  return (
    <div className={`flex flex-wrap justify-center gap-2 transition-all duration-500 ${faded ? 'opacity-30' : 'opacity-100'}`}>
      {Array.from({ length: count }).map((_, i) => {
        // Check if this specific item is currently being "taught" (highlighted)
        const isHighlighted = highlightIndex === i;
        
        // For subtraction teaching: items from the end are crossed out
        // e.g. count=5, crossedOutCount=2. Indices 3 and 4 should be crossed.
        const isCrossedOut = i >= (count - crossedOutCount);

        return (
          <div 
            key={i} 
            onClick={handleItemClick}
            className={`
              relative text-4xl sm:text-5xl select-none cursor-pointer transition-all duration-300
              ${isCelebrating ? 'animate-bounce' : ''}
              ${!isCelebrating && !isHighlighted && !isCrossedOut ? 'animate-pop hover:scale-110' : ''}
              ${isHighlighted ? 'animate-teach-scale z-10' : ''}
              ${isCrossedOut ? 'animate-teach-fade grayscale' : ''}
            `}
            style={{ 
              animationDelay: isCelebrating ? `${i * 0.1}s` : '0s' 
            }}
          >
            {emoji}
            
            {/* Visual X for subtraction or faded prop */}
            {(isSubtraction || isCrossedOut) && (
               <span className={`
                 absolute inset-0 flex items-center justify-center text-red-500 font-bold text-5xl pointer-events-none
                 ${isCrossedOut ? 'opacity-100 scale-125' : 'opacity-80'}
               `}>
                 /
               </span>
            )}
            
            {/* Number badge when highlighting */}
            {isHighlighted && (
               <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg font-bold text-candy-blue bg-white px-2 rounded-full shadow-sm animate-bounce">
                 {i + 1}
               </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VisualCounter;