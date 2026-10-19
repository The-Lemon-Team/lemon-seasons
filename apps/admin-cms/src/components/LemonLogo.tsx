import React from 'react';

interface LemonLogoProps {
  className?: string;
  size?: number | string;
  glow?: boolean;
  animated?: boolean;
  showAdminBadge?: boolean;
}

export const LemonLogo: React.FC<LemonLogoProps> = ({
  className = '',
  size = 32,
  glow = true,
  animated = true,
  showAdminBadge = true,
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title="Lemon CMS — Панель управления"
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
          {/* Main Lemon Body Gradient with warmer Admin citrus-gold tone */}
          <linearGradient id="lemon-admin-grad-body" x1="15%" y1="15%" x2="85%" y2="85%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="25%" stopColor="#fde047" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Leaf Gradient */}
          <linearGradient id="lemon-admin-grad-leaf" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="50%" stopColor="#65a30d" />
            <stop offset="100%" stopColor="#3f6212" />
          </linearGradient>

          {/* Specular Highlight */}
          <linearGradient id="lemon-admin-grad-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Admin Shield Gradient */}
          <linearGradient id="lemon-admin-shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>

          {/* Soft Blur Filter for Ambient Glow */}
          <filter id="lemon-admin-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>

          {/* Admin Badge Glow Filter */}
          <filter id="lemon-admin-badge-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#ef4444" floodOpacity="0.6" />
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
              opacity: 0.7;
              transform: scale(1.06);
            }
          }
          @keyframes adminBadgePulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.04);
            }
          }
        `}</style>

        {/* Dual Ambient Aura: Golden Citrus + Admin Ruby Aura */}
        {glow && (
          <>
            <ellipse
              cx="50"
              cy="53"
              rx="36"
              ry="28"
              fill="#f59e0b"
              filter="url(#lemon-admin-soft-glow)"
              className="pointer-events-none"
              style={{
                transformOrigin: '50px 53px',
                animation: animated ? 'lemonGlowPulse 4.5s ease-in-out infinite' : 'none',
              }}
            />
            <ellipse
              cx="54"
              cy="56"
              rx="30"
              ry="24"
              fill="#ef4444"
              opacity="0.3"
              filter="url(#lemon-admin-soft-glow)"
              className="pointer-events-none"
              style={{
                transformOrigin: '54px 56px',
                animation: animated ? 'lemonGlowPulse 4.5s ease-in-out infinite' : 'none',
              }}
            />
          </>
        )}

        {/* Lemon Fruit Body */}
        <g>
          {/* Main Lemon Body Path with organic tips */}
          <path
            d="M 22 45 C 16 49, 13 56, 17 63 C 21 72, 33 83, 50 83 C 67 83, 81 72, 84 62 C 87 53, 81 44, 76 39 C 69 32, 57 28, 48 28 C 37 28, 27 36, 22 45 Z"
            fill="url(#lemon-admin-grad-body)"
          />

          {/* Top Left Citrus Tip */}
          <path
            d="M 22 45 C 19 43, 14 43, 13 47 C 12 50, 15 53, 17 63"
            fill="url(#lemon-admin-grad-body)"
          />

          {/* Bottom Right Citrus Tip */}
          <path
            d="M 84 62 C 87 64, 91 63, 92 59 C 93 55, 89 51, 84 49"
            fill="url(#lemon-admin-grad-body)"
          />

          {/* Specular Highlight Arc */}
          <path
            d="M 31 37 C 41 33, 57 33, 67 40 C 73 44, 77 51, 76 57"
            stroke="url(#lemon-admin-grad-highlight)"
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
            fill="url(#lemon-admin-grad-leaf)"
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
            fill="url(#lemon-admin-grad-leaf)"
            opacity="0.9"
          />

          {/* Admin Distinction: Crimson Pip at the Stem Junction */}
          <circle cx="48" cy="27" r="2" fill="#ef4444" />
        </g>

        {/* Admin Distinction: Signature Security & Privilege Shield Emblem Badge */}
        {showAdminBadge && (
          <g
            style={{
              transformOrigin: '73px 71px',
              animation: animated ? 'adminBadgePulse 4s ease-in-out infinite' : 'none',
            }}
            filter="url(#lemon-admin-badge-glow)"
          >
            {/* Outer Badge Disc */}
            <circle
              cx="73"
              cy="71"
              r="14"
              fill="#121414"
              stroke="#ef4444"
              strokeWidth="1.8"
            />

            {/* Inner Shield Silhouette */}
            <path
              d="M 73 62 L 79.5 65 C 79.5 70.8, 76.5 75, 73 77 C 69.5 75, 66.5 70.8, 66.5 65 Z"
              fill="url(#lemon-admin-shield-grad)"
              stroke="#fca5a5"
              strokeWidth="0.8"
            />

            {/* Emblem Star inside Shield */}
            <path
              d="M 73 65.5 L 74 67.8 L 76.5 68 L 74.6 69.6 L 75.2 72.1 L 73 70.8 L 70.8 72.1 L 71.4 69.6 L 69.5 68 L 72 67.8 Z"
              fill="#ffffff"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
