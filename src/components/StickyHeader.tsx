import React from 'react';

interface StickyHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({
  children,
  className = '',
}) => (
  <div
    className={`sticky top-0 z-30 -mx-3 sm:mx-0 px-3 sm:px-0 -mt-[calc(0.875rem+env(safe-area-inset-top,0px))] sm:-mt-[calc(1.5rem+env(safe-area-inset-top,0px))] pt-[calc(0.875rem+env(safe-area-inset-top,0px))] sm:pt-[calc(1.5rem+env(safe-area-inset-top,0px))] bg-[#F5F3FD]/80 dark:bg-[#0F0D18]/80 backdrop-blur-xl pb-3 transition-colors ${className}`}
  >
    {children}
  </div>
);