import React from 'react';

interface ObsidianLogoProps {
  className?: string;
  size?: number | string;
  glow?: boolean;
}

export const ObsidianLogo: React.FC<ObsidianLogoProps> = ({
  className = '',
  size = 20,
  glow = false,
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-full bg-[#8b5cf6]/40 blur-sm pointer-events-none"
          style={{ transform: 'scale(1.2)' }}
        />
      )}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_2px_8px_rgba(139,92,246,0.35)]"
      >
        <defs>
          <linearGradient id="obsidian-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
          <linearGradient id="obsidian-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#581c87" />
          </linearGradient>
          <linearGradient id="obsidian-grad-3" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d8b4fe" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
          <linearGradient id="obsidian-grad-4" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b0764" />
            <stop offset="100%" stopColor="#6b21a8" />
          </linearGradient>
        </defs>

        {/* Facet 1 - Main Top Right */}
        <polygon
          points="50,4 88,32 50,56 28,34"
          fill="url(#obsidian-grad-3)"
        />

        {/* Facet 2 - Top Left */}
        <polygon
          points="50,4 28,34 12,42 22,20"
          fill="url(#obsidian-grad-1)"
        />

        {/* Facet 3 - Far Right */}
        <polygon
          points="88,32 94,54 74,78 50,56"
          fill="url(#obsidian-grad-2)"
        />

        {/* Facet 4 - Bottom Center Point */}
        <polygon
          points="50,56 74,78 50,96 26,76"
          fill="url(#obsidian-grad-2)"
        />

        {/* Facet 5 - Bottom Left */}
        <polygon
          points="28,34 50,56 26,76 8,58 12,42"
          fill="url(#obsidian-grad-4)"
        />

        {/* Facet 6 - Bottom Spike Shading */}
        <polygon
          points="26,76 50,96 50,56"
          fill="#4c1d95"
          opacity="0.75"
        />

        {/* Crystal Highlights / Inner Glow Lines */}
        <polyline
          points="50,4 50,56 50,96"
          stroke="#f3e8ff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
        <polyline
          points="28,34 50,56 88,32"
          stroke="#f3e8ff"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
        <polyline
          points="12,42 28,34 26,76"
          stroke="#d8b4fe"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
        />
      </svg>
    </div>
  );
};
