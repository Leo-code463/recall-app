import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SuccessBadgeProps {
  isVisible: boolean;
  onAnimationComplete?: () => void;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SuccessBadge: React.FC<SuccessBadgeProps> = ({
  isVisible,
  onAnimationComplete,
  message,
  size = 'md',
}) => {
  // Generate a mathematically perfect scalloped circle SVG path
  const getScallopPath = (cx: number, cy: number, rAvg: number, amplitude: number, waves: number) => {
    const points: string[] = [];
    const steps = waves * 8; // High resolution for smooth curves
    for (let i = 0; i <= steps; i++) {
      const theta = (i * 2 * Math.PI) / steps;
      const r = rAvg + amplitude * Math.cos(waves * theta);
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return points.join(' ') + ' Z';
  };

  const pathData = getScallopPath(50, 50, 41, 3.2, 16);

  const dimensions = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  };

  return (
    <AnimatePresence onExitComplete={onAnimationComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/65 backdrop-blur-xs pointer-events-none"
        >
          {/* Main Container */}
          <motion.div
            initial={{ scale: 0.4, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: -10 }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 18,
            }}
            className="flex flex-col items-center gap-4 bg-white dark:bg-[#1A1D1F] p-7 sm:p-9 rounded-3xl border border-gray-100 dark:border-[#272B30] shadow-2xl max-w-[280px] sm:max-w-xs text-center pointer-events-auto"
          >
            {/* The Rosette Badge / Scalloped Circle */}
            <div className={`relative ${dimensions[size]} flex items-center justify-center`}>
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full drop-shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
              >
                {/* Wavy scalloped background */}
                <motion.path
                  d={pathData}
                  fill="#10B981" // Radiant emerald/teal green exactly matching the video
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 15,
                    delay: 0.05,
                  }}
                />

                {/* Draw-in Checkmark SVG path */}
                <motion.path
                  d="M 32 50 L 44 62 L 68 38"
                  fill="transparent"
                  stroke="#FFFFFF"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    type: 'tween',
                    ease: 'easeOut',
                    duration: 0.4,
                    delay: 0.35,
                  }}
                />
              </svg>
            </div>

            {/* Optional text message under the badge */}
            {message && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="text-xs sm:text-sm font-extrabold text-[#1A1A1A] dark:text-white"
              >
                {message}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
