import React from 'react';
import { AILogo } from './AILogo';

interface RecallLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const RecallLogo: React.FC<RecallLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <AILogo size={size} />
    </div>
  );
};

