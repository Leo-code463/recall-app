import React from 'react';

interface AILogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isThinking?: boolean;
  alt?: string;
}

const numTicks = 42;
const cx = 100;
const cy = 100;
const centerRadius = 24;

// Precompute ray lines
const rays = Array.from({ length: numTicks }, (_, i) => {
  const angle = (i / numTicks) * 2 * Math.PI - Math.PI / 2;
  const harmonic = Math.sin(angle * 4) * 2 + Math.cos(angle * 2) * 1.5;
  const r1 = 49;
  const r2 = 68 + harmonic;
  const x1 = (cx + r1 * Math.cos(angle)).toFixed(2);
  const y1 = (cy + r1 * Math.sin(angle)).toFixed(2);
  const x2 = (cx + r2 * Math.cos(angle)).toFixed(2);
  const y2 = (cy + r2 * Math.sin(angle)).toFixed(2);
  return { id: i, x1, y1, x2, y2 };
});

export const AILogo: React.FC<AILogoProps> = ({
  className = '',
  size = 'md',
  isThinking = false,
  alt = 'AI Logo',
}) => {
  const sizeMap = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
    '2xl': 'w-20 h-20',
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`inline-flex items-center justify-center relative shrink-0 ${currentSizeClass} ${className}`}
      role="img"
      aria-label={alt}
    >
      <svg
        viewBox="0 0 200 200"
        className={`w-full h-full ${
          isThinking ? 'animate-[spin_4s_linear_infinite]' : ''
        } transition-transform duration-500`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="aiLogoRadialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B1D9F" />
            <stop offset="35%" stopColor="#7B22BC" />
            <stop offset="70%" stopColor="#9C44D4" />
            <stop offset="100%" stopColor="#BC6EEB" />
          </linearGradient>
        </defs>

        {/* Outer radial sunburst / acoustic iris */}
        <g
          stroke="url(#aiLogoRadialGrad)"
          strokeWidth="4.2"
          strokeLinecap="round"
          className={isThinking ? 'opacity-90' : 'opacity-100'}
        >
          {rays.map((ray) => (
            <line
              key={ray.id}
              x1={ray.x1}
              y1={ray.y1}
              x2={ray.x2}
              y2={ray.y2}
            />
          ))}
        </g>

        {/* Center circle */}
        <circle
          cx="100"
          cy="100"
          r={centerRadius}
          fill="#761EAF"
          className={isThinking ? 'animate-pulse' : ''}
        />
      </svg>
    </div>
  );
};
