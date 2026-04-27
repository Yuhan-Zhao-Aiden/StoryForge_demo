---
name: Cinematic Narrative System
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#cfc2d6'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#988d9f'
  outline-variant: '#4d4354'
  surface-tint: '#ddb7ff'
  primary: '#ddb7ff'
  on-primary: '#490080'
  primary-container: '#b76dff'
  on-primary-container: '#400071'
  inverse-primary: '#842bd2'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#ffb0cd'
  on-tertiary: '#640039'
  tertiary-container: '#f751a1'
  on-tertiary-container: '#570032'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f0dbff'
  primary-fixed-dim: '#ddb7ff'
  on-primary-fixed: '#2c0051'
  on-primary-fixed-variant: '#6900b3'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#ffd9e4'
  tertiary-fixed-dim: '#ffb0cd'
  on-tertiary-fixed: '#3e0022'
  on-tertiary-fixed-variant: '#8c0053'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin: 32px
---

## Brand & Style

This design system is engineered to evoke the feeling of a high-end digital theater for creators. The brand personality is immersive, sophisticated, and boundary-pushing, designed to fade into the background while highlighting the user's creative output through vibrant, glowing accents.

The visual style merges **Glassmorphism** with a **Futuristic Cinematic** aesthetic. It relies on deep, obsidian-like surfaces layered with translucent panels that utilize backdrop filters to create depth. The interface should feel like a high-end SaaS platform from a near-future setting—precise, polished, and evocative.

## Colors

The palette is anchored by a nearly black "Deep Charcoal" base to maximize the "pop" of the neon accents. 

- **Primary (Neon Purple):** Used for primary actions, focus states, and the start of flow gradients.
- **Secondary (Electric Blue):** Used for collaborative indicators, secondary actions, and node connections.
- **Tertiary (Hot Pink):** Used for highlighting special features, creative sparks, or destructive actions with a high-energy feel.
- **Gradients:** Use the three-point "Accent Gradient" sparingly for high-impact elements like progress bars, active states, or brand-specific nodes.

All interactive elements should feature a 0-10px "glow" (box-shadow) using their respective hex color at 30-50% opacity to simulate light emission on the dark canvas.

## Typography

This design system utilizes a high-contrast typographic pairing to balance technical precision with creative flair. 

**Space Grotesk** is used for all headings and display text. Its geometric and slightly eccentric letterforms reinforce the futuristic, creative vibe. 

**Inter** is used for all body copy, inputs, and interface labels. Its neutrality ensures that even in a complex collaborative environment, legibility remains the priority. For secondary labels or meta-data, use the `label-sm` style with increased letter spacing to maintain an organized, "HUD-like" (Heads Up Display) appearance.

## Layout & Spacing

The layout follows a **fluid grid** model to accommodate expansive storytelling canvases and dense editorial tools. 

- **Grid:** Use a 12-column grid for standard pages with 24px gutters.
- **Canvas Areas:** For the collaborative writing space, use a centered "fixed-fluid" hybrid (max-width 1200px) to maintain line length readability.
- **Rhythm:** All spacing must be a multiple of the 4px unit. Use `xl` (40px) for section breathing room to maintain the premium, high-end feel. 
- **Panels:** Sidebars and utility panels should be collapsible to maximize the "cinematic" immersion of the main workspace.

## Elevation & Depth

Depth is the core of this design system’s immersive quality. Hierarchy is communicated through **Glassmorphism** and **Light Emission** rather than traditional solid shadows.

1.  **Level 0 (Base):** Deep Charcoal (#09090B).
2.  **Level 1 (Panels):** Semi-transparent surfaces with a `backdrop-filter: blur(12px)`. These panels feature a 1px inner border (stroke) at 10% white to define edges.
3.  **Level 2 (Floating/Active):** These elements receive a soft, colored ambient glow (e.g., 0px 8px 24px rgba(168, 85, 247, 0.15)) to indicate they are "powered on" or active.
4.  **Connections:** Use 2px glowing lines (SVG) to connect nodes or story points, using gradients between the primary and secondary colors.

## Shapes

The shape language is modern and approachable, utilizing generous corner radii to offset the "sharpness" of the neon colors.

- **Small Elements (Buttons, Inputs):** 8px (0.5rem) radius.
- **Containers & Cards:** 16px (1rem) radius.
- **Feature Cards/Large Modals:** 24px (1.5rem) radius.
- **Nodes/Avatars:** Circular (pill-shaped) to distinguish individual contributors and story entities from the structural UI.

## Components

### Buttons
Primary buttons should use the `accent_gradient` with white text and a subtle outer glow on hover. Secondary buttons should be "Ghost" style—a glass background with a 1px border colored by the primary neon purple.

### Cards
Cards must utilize the Glassmorphism style. Backgrounds should be `surface_glass` with a `rounded-lg` radius. On hover, the 1px border should transition from low-opacity white to the primary neon color.

### Inputs
Input fields are dark and recessed. Use a 1px border that glows when focused. Placeholder text should be high-contrast but muted (e.g., 40% opacity white).

### Collaborative Nodes
Distinctive rounded components that show user avatars and "active line" connections. Use glowing paths (Neon Purple to Electric Blue gradients) to indicate links between different story elements or collaborators.

### Chips & Tags
Small, pill-shaped elements with low-opacity background fills of the accent colors. Text inside tags should be `label-sm` for a technical, metadata appearance.

### Floating Action Buttons (FABs)
Large, circular buttons using the `accent_gradient`. They should possess a persistent 15px blur glow to signify their importance in the creative flow.