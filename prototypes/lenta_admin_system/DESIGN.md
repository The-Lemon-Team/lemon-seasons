---
name: Lenta Admin System
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#393939'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1b1c1c'
  surface-container: '#1f2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#c9c7b2'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#303031'
  outline: '#93927e'
  outline-variant: '#484837'
  surface-tint: '#c9cd58'
  primary: '#c9cd58'
  on-primary: '#313300'
  primary-container: '#939626'
  on-primary-container: '#2a2c00'
  inverse-primary: '#606200'
  secondary: '#c9c8a5'
  on-secondary: '#313219'
  secondary-container: '#4a4b2f'
  on-secondary-container: '#bbba97'
  tertiary: '#a4d0bf'
  on-tertiary: '#0a372b'
  tertiary-container: '#6f998a'
  on-tertiary-container: '#013025'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e6e971'
  primary-fixed-dim: '#c9cd58'
  on-primary-fixed: '#1c1d00'
  on-primary-fixed-variant: '#484a00'
  secondary-fixed: '#e6e4bf'
  secondary-fixed-dim: '#c9c8a5'
  on-secondary-fixed: '#1c1d06'
  on-secondary-fixed-variant: '#48482d'
  tertiary-fixed: '#bfecda'
  tertiary-fixed-dim: '#a4d0bf'
  on-tertiary-fixed: '#002118'
  on-tertiary-fixed-variant: '#244e41'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  metadata:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for high-performance administrative workflows, prioritizing clarity and long-session comfort. It employs a **Modern Minimalist** aesthetic with a refined **Technical Edge**, now updated with a high-energy "Rainbow" color variant that introduces a more vibrant, electric personality to the workspace.

The interface avoids high-frequency visual noise, opting instead for a "Zen" developer environment feel inspired by modern code editors. The target audience—content managers and developers—requires a tool that feels precise yet approachable. The emotional response should be one of "quiet efficiency" mixed with modern vitality. Whitespace is used as a functional tool to separate concerns, while olive, sage, and forest tones provide semantic meaning and a unique, nature-inspired technical palette.

## Colors

The palette has transitioned from a stable blue-centric scheme to a "Rainbow" variant rooted in olive and desaturated greens. This shift maintains professional legibility while offering a distinct, high-character aesthetic for technical environments.

- **Primary (Olive Gold):** Used for primary actions, active states, and brand highlights. This energetic tone (#797c06) ensures high visibility and a unique brand identity.
- **Secondary (Sage Gray):** Used for secondary actions and muted UI elements, providing a grounding, earthy alternative to the primary color.
- **Tertiary (Teal Green):** Used for supplementary actions, specific highlights, and critical technical status changes.
- **Neutral (Slate Gray):** Defines the structural boundaries and provides a balanced foundation for the dark interface.

In dark mode, surfaces use subtle variations of the base olive-charcoal to create depth while maintaining the system's warm, technical atmosphere.

## Typography

This design system uses a dual-font strategy to distinguish between UI content and system metadata.

1. **Inter** serves as the primary workhorse. It is utilized for all functional UI elements, headers, and body text. Tight letter-spacing is applied to larger headings to maintain a modern, "tucked" appearance.
2. **JetBrains Mono** is the secondary metadata font. It is used for IDs, timestamps, tags, and code snippets. This provides a clear visual signal that the user is looking at "data" rather than "interface."

Hierarchy is established primarily through weight and the switch between Sans and Mono, rather than drastic changes in scale.

## Layout & Spacing

The layout follows a **Fluid Content / Fixed Sidebar** model. 
- **Sidebar:** Fixed at 240px. Contains navigation and high-level workspace switching.
- **Main Canvas:** Fluid width with a max-content constraint of 1440px for readability.
- **Grid:** A 12-column system is used for dashboard widgets and form layouts.

Spacing is built on a 4px base unit. To achieve the "airy" feel, the system favors `16px` (md) and `24px` (lg) internal padding for cards and containers. Information density should be kept "Comfortable" rather than "Compact," allowing elements room to breathe.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** and **Gentle Shadows**. 

- **Level 0 (Background):** The base background color, now featuring a subtle olive tint.
- **Level 1 (Cards/Sidebar):** A slightly lighter shade with a 1px soft border.
- **Level 2 (Popovers/Modals):** These use the same color as Level 1 but add a "Gentle Shadow": `0px 10px 30px rgba(0,0,0,0.3)`. 

Borders are the primary method of separation. In dark mode, borders use semi-transparent tinted grays to keep the UI looking flat and modern, only lifting off the page when user interaction is required.

## Shapes

The shape language is **Soft and Precise**. 
- Standard components (buttons, inputs, cards) use a `0.25rem` (4px) radius to maintain a professional, slightly technical look.
- Taxonomy tags and status indicators use a **Pill** shape (full radius) to distinguish them as discrete, clickable, or removable metadata objects.
- Selection indicators (like the active state in a sidebar) use a vertical bar or a subtle rounded background highlight.

## Components

### Buttons & Inputs
- **Buttons:** Solid fills using the energetic olive palette. Hover states should involve a slight increase in luminosity and a gentle shadow lift.
- **Inputs:** Minimalist outline style. The border color changes to the Primary Olive Gold on focus, with a very subtle glow.

### Metadata & Technical Elements
- **Taxonomy Tags:** Pill-shaped, using low-opacity versions of the palette colors. On hover, they should elevate slightly via a subtle shadow.
- **Badges:** Small, squared-off (`rounded-sm`) labels for content types (e.g., "JSON", "MDX"), using the Mono font at `label-caps` size.
- **Date Containers:** Monospaced text wrapped in a tinted grey ghost-border, often accompanied by a small clock/calendar icon.

### Cards & Lists
- **Cards:** No heavy borders. Use tonal shifts to define boundaries. Padding is generous (24px) to maintain the "airy" aesthetic.
- **Lists:** Rows should have a subtle background hover effect and no dividing lines unless the list is extremely dense.