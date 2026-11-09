import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import animationData from '../assets/searchEmptyAnimation.json';

interface EmptySearchAnimationProps {
  title?: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export const EmptySearchAnimation: React.FC<EmptySearchAnimationProps> = ({
  title = 'Nessuna registrazione trovata',
  subtitle = "Prova a cercare un'altra parola chiave o verifica i filtri applicati.",
  actionButton,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const animInstance = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData,
    });

    return () => {
      animInstance?.destroy();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-4 px-4 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="w-44 h-44 sm:w-56 sm:h-56 mb-2 flex items-center justify-center">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <h3 className="text-base sm:text-lg font-extrabold text-[#16161E] dark:text-white tracking-tight">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-gray-500 dark:text-neutral-400 mt-1 max-w-sm font-medium leading-relaxed">
        {subtitle}
      </p>

      {actionButton && <div className="mt-4">{actionButton}</div>}
    </div>
  );
};