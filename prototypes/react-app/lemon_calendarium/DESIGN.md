---
name: Lemon Calendarium
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#383939'
  surface-container-lowest: '#0d0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2a'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c9c7b2'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#93927e'
  outline-variant: '#484837'
  surface-tint: '#c9cd58'
  primary: '#e5e971'
  on-primary: '#313300'
  primary-container: '#c9cd58'
  on-primary-container: '#535600'
  inverse-primary: '#5f6200'
  secondary: '#c5c7c6'
  on-secondary: '#2e3131'
  secondary-container: '#444747'
  on-secondary-container: '#b3b5b5'
  tertiary: '#eaddff'
  on-tertiary: '#38265e'
  tertiary-container: '#d2bcff'
  on-tertiary-container: '#5b4983'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e971'
  primary-fixed-dim: '#c9cd58'
  on-primary-fixed: '#1c1d00'
  on-primary-fixed-variant: '#484a00'
  secondary-fixed: '#e1e3e2'
  secondary-fixed-dim: '#c5c7c6'
  on-secondary-fixed: '#191c1c'
  on-secondary-fixed-variant: '#444747'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d2bcff'
  on-tertiary-fixed: '#220e47'
  on-tertiary-fixed-variant: '#4f3d76'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
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
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  mono-date:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1'
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
The design system for this product is a sophisticated blend of **Modern Corporate** and **Technical Editorial**. It bridges the gap between high-density data management and premium digital publishing. The aesthetic is "Instrumental Luxury"—it feels like a professional precision tool while maintaining the legibility and white space of a high-end magazine.

The visual narrative centers on chronological clarity. Every element is designed to feel like a discrete entry in a master ledger. Key characteristics include:
- **High-Density Utility:** Information is packed efficiently but separated by rigorous structural logic.
- **Tech-Forward Precision:** Mono-spaced accents and sharp borders suggest an environment of accuracy and performance.
- **Subdued Premium:** A dark, desaturated canvas punctuated by a singular, vibrant accent color.

## Colors
The palette is built on a "Dark Olive" foundation, prioritizing long-session comfort and high-contrast information hierarchy.

- **Base Layer:** The deepest value (#121414) serves as the infinite canvas.
- **Surface Layer:** Card backgrounds and nested containers use #1b1e1e to create subtle depth without relying on shadows.
- **Structural Stroke:** Borders (#242828) define the grid, ensuring chronological blocks are clearly demarcated.
- **The Glow (Olive Gold):** #c9cd58 is used sparingly for intent. It marks the "Now," the active selection, and primary calls to action.

## Typography
The typographic system utilizes a dual-font approach to separate content from metadata.

- **Inter (SANS):** Used for titles, descriptions, and primary UI navigation. It provides a neutral, highly readable foundation that feels modern and accessible.
- **JetBrains Mono (MONO):** Used exclusively for timestamps, technical data, tags, and coordinates. This creates a "data layer" that feels distinct from the "narrative layer."

All headings should use tighter letter-spacing (-0.02em) to lean into the editorial aesthetic. Labels in JetBrains Mono should be all-caps when used for status or categorical tags to increase their "UI-as-instrument" feel.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid Grid**. The sidebar and navigation elements remain fixed, while the chronological feed expands within a central container (max-width: 1200px).

- **The Chronological Spine:** A vertical line or consistent margin-left offset should be used to visually thread events together.
- **Rhythm:** A 4px baseline grid ensures technical alignment.
- **Grouping:** Use `stack-lg` to separate different days/months, and `stack-sm` for items within the same hour or logic group.
- **Sticky Behavior:** Date headers must stick to the top of the viewport during scroll, utilizing a slight backdrop-blur (10px) to maintain context without obscuring the feed.

## Elevation & Depth
This system avoids traditional soft shadows in favor of **Tonal Layering and Sharp Outlines**.

- **Depth Level 0 (Background):** #121414.
- **Depth Level 1 (Cards/Panels):** #1b1e1e with a 1px solid border of #242828.
- **Depth Level 2 (Modals/Popovers):** #1b1e1e with a more prominent border (#323636) and a very subtle, 0% blur black shadow to lift it slightly.
- **Active State:** Elements do not "glow" with shadows; instead, they receive the Olive Gold border (#c9cd58) or a solid Olive Gold fill.

This approach maintains a "flat but layered" architectural feel, consistent with professional developer tools.

## Shapes
The shape language is **Technical and Tight**. 

- **Containers/Cards:** Use `rounded-sm` (0.25rem). This maintains a disciplined, grid-like appearance while avoiding the harshness of 0px corners.
- **Interaction Elements:** Buttons and form inputs follow the same `rounded-sm` logic.
- **Filters/Chips:** Use `rounded-xl` (Pill-shaped). This is the only exception to the rectangular rule, used to make interactive "meta-tags" instantly recognizable as distinct from content cards.

## Components
- **Chronological Cards:** Should feature a 1px border. When an item is "Active" or "Current," the left border should thicken to 3px and change to Olive Gold (#c9cd58).
- **Sticky Date Headers:** Large, bold Inter font with the current month/year. Below it, a thin horizontal rule spanning the container width.
- **Minimalist Buttons:** Primarily ghost-style (no fill, border only) with monochrome icons. The Primary Action button uses a solid Olive Gold fill with #121414 text.
- **Pill Filters:** Background of #242828 with Mono-spaced text. Active state: Olive Gold text with a subtle underline or solid fill.
- **Input Fields:** Flat #121414 background with a #242828 border. On focus, the border transitions to Olive Gold.
- **Timeline Indicator:** A vertical 1px line in #242828 that runs through the gutter of the feed, connecting chronologically grouped items.