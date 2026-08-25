import React from 'react';

interface LemonLogoProps {
  className?: string;
  size?: number | string;
  glow?: boolean;
  animated?: boolean;
}

export const LemonLogo: React.FC<LemonLogoProps> = ({
  className = '',
  size = 32,
  glow = true,
  animated = true,
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10"
        style={{
          overflow: 'visible',
          animation: animated ? 'lemonFloat 5s ease-in-out infinite' : 'none',
        }}
      >
        <defs>
          {/* Main Lemon Body Gradient */}
          <linearGradient id="lemon-grad-body" x1="15%" y1="15%" x2="85%" y2="85%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="30%" stopColor="#facc15" />
            <stop offset="70%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>

          {/* Leaf Gradient */}
          <linearGradient id="lemon-grad-leaf" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="50%" stopColor="#65a30d" />
            <stop offset="100%" stopColor="#3f6212" />
          </linearGradient>

          {/* Specular Spec / Rind Highlight */}
          <linearGradient id="lemon-grad-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Soft Blur Filter for Ambient Glow (No hard border) */}
          <filter id="lemon-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <style>{`
          @keyframes lemonFloat {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-2px) rotate(1.5deg);
            }
          }
          @keyframes lemonLeafSway {
            0%, 100% {
              transform: rotate(0deg);
            }
            50% {
              transform: rotate(-3.5deg);
            }
          }
          @keyframes lemonGlowPulse {
            0%, 100% {
              opacity: 0.35;
              transform: scale(1);
            }
            50% {
              opacity: 0.65;
              transform: scale(1.05);
            }
          }
        `}</style>

        {/* Soft Ambient Aura (Borderless) */}
        {glow && (
          <ellipse
            cx="50"
            cy="53"
            rx="36"
            ry="28"
            fill="#eab308"
            filter="url(#lemon-soft-glow)"
            className="pointer-events-none"
            style={{
              transformOrigin: '50px 53px',
              animation: animated ? 'lemonGlowPulse 4.5s ease-in-out infinite' : 'none',
            }}
          />
        )}

        {/* Lemon Fruit Body */}
        <g>
          {/* Main Lemon Body Path with organic tips */}
          <path
            d="M 22 45 C 16 49, 13 56, 17 63 C 21 72, 33 83, 50 83 C 67 83, 81 72, 84 62 C 87 53, 81 44, 76 39 C 69 32, 57 28, 48 28 C 37 28, 27 36, 22 45 Z"
            fill="url(#lemon-grad-body)"
          />

          {/* Top Left Citrus Tip */}
          <path
            d="M 22 45 C 19 43, 14 43, 13 47 C 12 50, 15 53, 17 63"
            fill="url(#lemon-grad-body)"
          />

          {/* Bottom Right Citrus Tip */}
          <path
            d="M 84 62 C 87 64, 91 63, 92 59 C 93 55, 89 51, 84 49"
            fill="url(#lemon-grad-body)"
          />

          {/* Specular Highlight Arc */}
          <path
            d="M 31 37 C 41 33, 57 33, 67 40 C 73 44, 77 51, 76 57"
            stroke="url(#lemon-grad-highlight)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Glossy Specular Spot */}
          <ellipse
            cx="41"
            cy="40"
            rx="7"
            ry="3.5"
            transform="rotate(-20 41 40)"
            fill="#ffffff"
            opacity="0.35"
          />
        </g>

        {/* Leaf & Stem with Soft Sway Animation */}
        <g
          style={{
            transformOrigin: '48px 28px',
            animation: animated ? 'lemonLeafSway 3.8s ease-in-out infinite' : 'none',
          }}
        >
          {/* Stem */}
          <path
            d="M 48 28 C 48 22, 51 18, 54 14"
            stroke="#3f6212"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Primary Leaf */}
          <path
            d="M 53 16 C 65 10, 76 17, 72 27 C 65 34, 52 27, 53 16 Z"
            fill="url(#lemon-grad-leaf)"
          />

          {/* Primary Leaf Vein */}
          <path
            d="M 53 16 C 60 21, 65 24, 70 26"
            stroke="#14532d"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Secondary Small Leaf */}
          <path
            d="M 49 22 C 41 18, 38 23, 42 28 C 46 30, 49 26, 49 22 Z"
            fill="url(#lemon-grad-leaf)"
            opacity="0.9"
          />
        </g>
      </svg>
    </div>
  );
};
