import React from 'react';

interface UserAvatarProps {
  name?: string;
  src?: string;
  className?: string; // dimensioni e colori del contenitore
}

/** Avatar rotondo: foto se presente, altrimenti l'iniziale del nome. */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  src,
  className = 'w-9 h-9 bg-purple-50 dark:bg-purple-950/20 text-[#6A49D8] dark:text-[#B29FFF] text-xs',
}) => (
  <div
    className={`rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden ${className}`}
  >
    {src ? (
      <img src={src} alt={name || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    ) : (
      name?.charAt(0).toUpperCase() || 'U'
    )}
  </div>
);
