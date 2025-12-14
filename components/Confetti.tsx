import React from 'react';

const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#FF8B94'];

const Confetti: React.FC = () => {
  // Create fixed number of particles
  const particles = Array.from({ length: 50 }).map((_, i) => {
    const left = Math.random() * 100;
    const animationDelay = Math.random() * 1;
    const bg = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 0.5 + 0.5; // Scale
    
    return (
      <div
        key={i}
        className="fixed top-0 w-3 h-3 rounded-sm pointer-events-none animate-fall z-50"
        style={{
          left: `${left}%`,
          backgroundColor: bg,
          animationDelay: `${animationDelay}s`,
          transform: `scale(${size})`,
        }}
      />
    );
  });

  return <>{particles}</>;
};

export default Confetti;
