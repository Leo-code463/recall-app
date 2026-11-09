import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  compact?: boolean;          // versione piccola per le colonne strette
  action?: React.ReactNode;   // es. un bottone "Invita un amico"
}

/** Stato vuoto animato: l'icona galleggia e un'onda viola si espande dietro di lei. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  compact = false,
  action,
}) => {
  const reduce = useReducedMotion(); // rispetta chi ha disattivato le animazioni nel telefono

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={`bg-white/60 dark:bg-white/[0.06] rounded-[24px] border border-dashed border-white/70 dark:border-white/10 text-center flex flex-col items-center gap-3 ${
        compact ? 'p-6' : 'p-8'
      }`}
    >
      <div className="relative w-14 h-14 flex items-center justify-center">
        {!reduce && (
          <motion.span
            className="absolute inset-0 rounded-full bg-[#6A49D8]/20"
            animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <motion.div
          animate={reduce ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-12 h-12 rounded-2xl bg-[#6A49D8]/10 text-[#6A49D8] dark:text-[#B29FFF] flex items-center justify-center"
        >
          <Icon className="w-6 h-6" />
        </motion.div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-bold text-[#16161E] dark:text-white">{title}</p>
        {description && (
          <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium max-w-[260px] mx-auto leading-normal">
            {description}
          </p>
        )}
      </div>

      {action}
    </motion.div>
  );
};
