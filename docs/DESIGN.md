---
name: Nocturne Cinema
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#c4c6ce'
  on-secondary: '#2d3037'
  secondary-container: '#464950'
  on-secondary-container: '#b6b8c0'
  tertiary: '#ffb869'
  on-tertiary: '#482900'
  tertiary-container: '#ca801e'
  on-tertiary-container: '#3f2300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#e1e2ea'
  secondary-fixed-dim: '#c4c6ce'
  on-secondary-fixed: '#191c22'
  on-secondary-fixed-variant: '#44474d'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#ffb869'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '800'
    lineHeight: 72px
    letterSpacing: -0.04em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter-desktop: 24px
  gutter-mobile: 16px
  margin-edge: 40px
  container-max: 1440px
---

## Brand & Style

The design system is engineered to deliver a "lights-out" cinematic experience, transforming a screen into a premium private theater. It targets cinephiles and power-users who manage vast libraries across multiple streaming services. 

The aesthetic is a sophisticated blend of **Minimalism** and **Glassmorphism**. By using deep, obsidian surfaces and vibrant, high-energy accents, the interface recedes into the background, allowing the media content—vibrant movie posters and high-definition backdrops—to take center stage. The emotional response should be one of immersion, luxury, and effortless control.

## Colors

The palette is rooted in the "True Black" philosophy to maximize contrast on OLED displays. 

- **Primary (Action Purple):** Used exclusively for interactive elements, call-to-action buttons, and active states. It provides a modern, energetic alternative to traditional media reds.
- **Surface (Obsidian):** The secondary color (#1A1D23) defines the containers, cards, and navigation bars, providing subtle separation from the primary background.
- **Background (Deep Charcoal):** The base layer (#0F1115) ensures the UI feels bottomless and immersive.
- **Functional Accents:** Used sparingly for metadata like "New Release" or "Watchlist" status.

## Typography

This design system utilizes **Inter** for its exceptional legibility and systematic feel. The hierarchy is intentionally dramatic; title treatments use heavy weights and tight letter-spacing to mimic movie posters, while metadata and labels use wider tracking for quick scanning.

Large display sizes are reserved for featured content titles on the dashboard. Body copy is kept clean and unobtrusive, ensuring that even dense plot summaries remain readable against dark backgrounds.

## Layout & Spacing

The layout follows a **Fluid Grid** model designed for browsing large visual sets. 

- **Desktop:** A 12-column grid with generous 24px gutters. This allows cards to scale comfortably from 2 to 6 columns wide depending on the content type (e.g., Wide Hero vs. Portrait Poster).
- **Mobile:** A 4-column grid with 16px margins. Content often utilizes horizontal "overflow" carousels to maintain card aspect ratios without vertical clutter.
- **Rhythm:** All spacing is based on an 8px base unit. Component padding should lean towards "spacious" to reinforce the premium, high-end feel.

## Elevation & Depth

Depth in the design system is achieved through **Glassmorphism** and tonal layering rather than traditional drop shadows.

1.  **The Base Layer:** The deep charcoal background.
2.  **The Surface Layer:** Semi-transparent obsidian (#1A1D23 at 80% opacity) with a `backdrop-filter: blur(20px)`. This is used for sidebars and persistent navigation.
3.  **The Content Layer:** Cards and interactive elements sit atop the surface. 
4.  **The Focus State:** Active elements utilize a subtle `0 0 20px rgba(139, 92, 246, 0.3)` outer glow (the Action Purple) to simulate the light emission of a screen.

Borders should be used sparingly, appearing as "Inner Glows" (1px solid white at 10% opacity) on the top and left edges of cards to define shape without adding visual weight.

## Shapes

The design system uses **Rounded** geometry. This softens the high-contrast "dark mode" and makes the interface feel approachable and modern.

- **Standard Elements:** 0.5rem (8px) for cards, input fields, and buttons.
- **Large Elements:** 1.5rem (24px) for hero containers and featured promotional banners.
- **Icons:** Provider icons (Netflix, Disney+) should retain their native branding but be housed within a uniform rounded-square container to maintain grid harmony.

## Components

### Media Cards
The core of the design system. Cards use a vertical 2:3 ratio for movies and 16:9 for episodes. On hover, cards should scale slightly (1.05x) and increase the intensity of their inner glow. The title and provider icon appear as a glassmorphic overlay at the bottom of the card.

### Progress Bars
Used for "Continue Watching." These are thin (4px), glowing bars using the Action Purple primary color. The background of the bar is a dark 20% opacity purple.

### Buttons
Primary buttons are solid Action Purple with white text. Secondary buttons are "Ghost" style—transparent backgrounds with a 1px border and 10% glass blur.

### Provider Chips
Small, pills-shaped indicators that sit in the corner of media cards. They use a high-blur glass background with the service's logo (e.g., a red 'N' for Netflix) to help users identify content source at a glance.

### Search & Inputs
Search bars are persistent in the top navigation, featuring a search icon and a 1px obsidian border that glows Action Purple when focused.