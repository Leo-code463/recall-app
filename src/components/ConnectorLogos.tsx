import React, { useState } from 'react';

// Google Docs Logo
export const GoogleDocsLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 4C7.79086 4 6 5.79086 6 8V40C6 42.2091 7.79086 44 10 44H38C40.2091 44 42 42.2091 42 40V16L30 4H10Z" fill="#2196F3" />
        <path d="M30 4V16H42L30 4Z" fill="#90CAF9" />
        <rect x="12" y="24" width="24" height="3" rx="1.5" fill="white" />
        <rect x="12" y="31" width="24" height="3" rx="1.5" fill="white" />
        <rect x="12" y="38" width="16" height="3" rx="1.5" fill="white" />
      </svg>
    );
  }

  return (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Google_Docs_icon_%282020%29.svg/512px-Google_Docs_icon_%282020%29.svg.png"
      alt="Google Docs"
      className={`${className} object-contain`}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
};

// Google Drive Logo (Original PNG)
export const GoogleDriveLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <svg viewBox="0 0 89 84" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.2 19l17.4 30.3h40.1L46.3 19H6.2z" fill="#FBBC05" />
        <path d="M46.3 19L28.9 49.3l20 34.7H89L71.6 53.7 46.3 19z" fill="#4285F4" />
        <path d="M23.6 49.3L3.6 84H54l20-34.7H23.6z" fill="#34A853" />
      </svg>
    );
  }

  return (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/512px-Google_Drive_icon_%282020%29.svg.png"
      alt="Google Drive"
      className={`${className} object-contain`}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
};

// Google Meet Logo (Original PNG)
export const GoogleMeetLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="22" width="52" height="52" rx="14" fill="#34A853" />
        <path d="M10 36v24c0 7.7 6.3 14 14 14h10V22H24C16.3 22 10 28.3 10 36z" fill="#4285F4" />
        <path d="M48 22H24C16.3 22 10 28.3 10 36v10h52V36C62 28.3 55.7 22 48 22z" fill="#FBBC05" />
        <path d="M48 74c7.7 0 14-6.3 14-14V48H10v12c0 7.7 6.3 14 14 14h24z" fill="#EA4335" />
        <path d="M62 40l22-15c2-1.5 5 0 5 3v44c0 3-3 4.5-5 3l-22-15V40z" fill="#34A853" />
      </svg>
    );
  }

  return (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Google_Meet_icon_%282020%29.svg/512px-Google_Meet_icon_%282020%29.svg.png"
      alt="Google Meet"
      className={`${className} object-contain`}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
};

// Google Calendar Logo (Original PNG)
export const GoogleCalendarLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="80" height="80" rx="18" fill="white" stroke="#E5E7EB" strokeWidth="2" />
        <path d="M10 28C10 18 18 10 28 10H72C82 10 90 18 90 28V32H10V28Z" fill="#4285F4" />
        <rect x="26" y="4" width="8" height="12" rx="2" fill="#1A73E8" />
        <rect x="66" y="4" width="8" height="12" rx="2" fill="#1A73E8" />
        <text x="50" y="74" textAnchor="middle" fontSize="38" fontWeight="900" fill="#1A73E8" fontFamily="system-ui, -apple-system, sans-serif">31</text>
      </svg>
    );
  }

  return (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Google_Calendar_icon_%282020%29.svg/512px-Google_Calendar_icon_%282020%29.svg.png"
      alt="Google Calendar"
      className={`${className} object-contain`}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
};

// Gemini Logo (Transparent Curved Star with beautiful gradient)
export const GeminiLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="geminiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9C27B0" />
        <stop offset="30%" stopColor="#4285F4" />
        <stop offset="60%" stopColor="#34A853" />
        <stop offset="85%" stopColor="#FBBC05" />
        <stop offset="100%" stopColor="#FF4B4B" />
      </linearGradient>
    </defs>
    <path d="M50 5C50 30, 30 50, 5 50C30 50, 50 70, 50 95C50 70, 70 50, 95 50C70 50, 50 30, 50 5Z" fill="url(#geminiGradient)" />
  </svg>
);

