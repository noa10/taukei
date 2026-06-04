---
name: High-Energy Mobile Commerce
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#5a403f'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#8e706f'
  outline-variant: '#e2bebc'
  surface-tint: '#b52330'
  primary: '#b52330'
  on-primary: '#ffffff'
  primary-container: '#ff5a5f'
  on-primary-container: '#61000e'
  inverse-primary: '#ffb3b0'
  secondary: '#006d37'
  on-secondary: '#ffffff'
  secondary-container: '#6bfe9c'
  on-secondary-container: '#00743a'
  tertiary: '#50616b'
  on-tertiary: '#ffffff'
  tertiary-container: '#8596a1'
  on-tertiary-container: '#1e2e37'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b0'
  on-primary-fixed: '#410007'
  on-primary-fixed-variant: '#92001b'
  secondary-fixed: '#6bfe9c'
  secondary-fixed-dim: '#4ae183'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005228'
  tertiary-fixed: '#d3e5f1'
  tertiary-fixed-dim: '#b7c9d5'
  on-tertiary-fixed: '#0c1e26'
  on-tertiary-fixed-variant: '#384953'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 16px
  gutter: 12px
---

## Brand & Style

The design system is engineered for high-velocity, direct-to-consumer interactions within the Malaysian independent merchant landscape. The brand personality is **vibrant, competitive, and optimistic**, blending the speed of modern food delivery with the "pop" of mobile gaming. It aims to evoke an immediate dopamine response through high-contrast visuals and playful micro-interactions.

The visual style is **Modern-Pop with a hint of Brutalism**, utilizing thick borders, high-saturation accents, and exaggerated roundedness to create a "toy-like" tactile feel. This approach ensures that merchants appear professional yet approachable, standing out in a crowded digital marketplace through bold geometry and expressive motion.

## Colors

The palette is anchored by **Electric Salmon**, a high-energy primary color designed to drive conversion and signal action. **Cyber Mint Green** is reserved strictly for positive feedback loops: successful orders, active tracking, and gamified rewards. 

**Deep Charcoal** provides the necessary weight and readability for typography, ensuring the interface feels grounded despite its high-energy accents. **Soft Pastel Blue** and **Soft Pastel Gray** are used for secondary zoning, creating subtle depth without competing with the primary action colors. All colors are applied with high-contrast ratios to maintain accessibility in bright outdoor environments typical of on-the-go food ordering.

## Typography

This design system uses a dual-font strategy to balance character with clarity. **Space Grotesk** is the voice of the brand, used for headings and price points to provide a technical, futuristic, and punchy aesthetic. **Plus Jakarta Sans** handles all functional text, providing a soft and friendly geometric counterpoint that remains highly legible at small sizes.

Headlines should utilize tight tracking (letter-spacing) to emphasize the "bold pop" aesthetic. Labels and captions should use slightly increased tracking and heavier weights to ensure they don't get lost against vibrant backgrounds.

## Layout & Spacing

The layout is **Mobile-First**, optimized for a 393px standard width. It utilizes a **4-column fluid grid** with 16px outer margins and 12px gutters. The spacing rhythm is based on a **4px baseline grid**, ensuring all elements align with mathematical precision even in a "playful" UI.

Content density is high to allow for quick scanning of menu items, but "breathing room" is maintained through generous vertical padding (32px+) between major content sections. Elements like horizontal product scrollers should peek from the screen edge to signal scrollability.

## Elevation & Depth

Depth is conveyed through **Physicality rather than Atmosphere**. Instead of traditional diffused shadows, this design system uses:

1.  **Crisp Micro-Shadows:** Short, high-opacity shadows (e.g., 2px offset, 0px blur) that make components look like physical tiles.
2.  **Tonal Stacking:** Using the Surface color (#F9FAFB) for the base background and White (#FFFFFF) for interactive cards to create a "raised" effect.
3.  **Thick Outlines:** 1.5px to 2px borders in Deep Charcoal or a darker shade of the element’s color to define boundaries clearly.
4.  **Active States:** When pressed, buttons and cards should visually "sink" by removing the shadow and shifting 2px downward, mimicking a haptic physical press.

## Shapes

The shape language is defined by **Exaggerated Roundness**. All primary containers and cards use a 16px (`rounded-lg`) corner radius to evoke a friendly, approachable feel. Small interactive elements like buttons use the pill-shape (`rounded-full`) or 12px radius to encourage tapping. 

Avoid sharp 0px corners entirely. The contrast between the rigid, geometric "Space Grotesk" typography and the soft, bubbly containers creates a distinctive "Modern-Pop" tension.

## Components

### Buttons
Primary buttons use a solid **Electric Salmon** fill with White text. They must feature a 2px bottom "offset shadow" that disappears on press. Secondary buttons use a white fill with a thick 2px Deep Charcoal border.

### Cards
Cards are the primary container. They use a 16px corner radius and a 1px Soft Pastel Gray border. For featured items, use a "Pop" style: a 2px Deep Charcoal border and a 4px offset micro-shadow.

### Chips & Badges
Use for categories and food tags. These should be semi-transparent versions of the primary/secondary colors or solid Soft Pastel Blue with 100px (pill) radius.

### Input Fields
Inputs use a Soft Pastel Gray background, 12px rounded corners, and a 2px border that turns Electric Salmon on focus. Placeholder text should be Deep Charcoal at 40% opacity.

### Navigation
A bottom navigation bar with high-contrast icons. The active state should be indicated by a subtle "pop" animation and an Electric Salmon color shift.

### Gamified Elements
Progress bars for order tracking should use **Cyber Mint Green** with a thick stroke and a "pulsing" animation for the current stage. Use custom emojis as status indicators to maintain the playful brand voice.