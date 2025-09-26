
import React from 'react';

const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg 
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
    >
        <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2m13 2h-2.5a3.5 3.5 0 0 0-3.5 3.5V11h-2v3h2v7h3v-7h3v-3h-3V8.5A1.5 1.5 0 0 1 15 7h3V5z"/>
    </svg>
);

export default FacebookIcon;
