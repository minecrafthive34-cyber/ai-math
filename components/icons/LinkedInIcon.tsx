
import React from 'react';

const LinkedInIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg 
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
    >
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-11 4H5v10h3V7m-1.5-2A1.5 1.5 0 0 0 5 6.5 1.5 1.5 0 0 0 6.5 8 1.5 1.5 0 0 0 8 6.5 1.5 1.5 0 0 0 6.5 5m11.5 2h-2.83c-.76 0-1.17.41-1.17 1.17V11h4v3h-4v7h-3v-7h-2v-3h2v-2.5c0-1.92 1.58-3.5 3.5-3.5H18v3z"/>
    </svg>
);

export default LinkedInIcon;
