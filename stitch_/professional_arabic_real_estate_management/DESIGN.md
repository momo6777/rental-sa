---
name: Professional Arabic Real Estate Management
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444651'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#1b2b3f'
  on-tertiary: '#ffffff'
  tertiary-container: '#314156'
  on-tertiary-container: '#9dadc6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 42px
  headline-lg:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Noto Sans Arabic
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Noto Sans Arabic
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Noto Sans Arabic
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
  headline-xl-mobile:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  container-margin: 24px
  gutter: 16px
  card-padding: 20px
  stack-gap: 12px
---

## Brand & Style
This design system is engineered for the high-stakes world of Middle Eastern real estate management. The brand personality is **authoritative, efficient, and growth-oriented**. It balances the traditional stability required for property management with the modern dynamism of a digital-first Arabic enterprise.

The aesthetic follows **Flat 2.0 principles**: a foundation of flat design enhanced by subtle layers of depth and refined tactile details. This approach ensures maximum legibility for complex data (rent rolls, occupancy rates, and maintenance logs) while maintaining a premium feel. The interface prioritizes RTL (Right-to-Left) layouts naturally, ensuring that hierarchy and scanning patterns align with Arabic reading habits.

## Colors
The palette is rooted in professionalism and growth. 
- **Primary Blue (#1E3A8A):** Used for navigation, primary actions, and branding to instill trust and institutional stability.
- **Emerald Green (#10B981):** Represents growth, financial success, and positive property status. It is used as a vibrant accent for high-priority success indicators.
- **Background Slate (#F8FAFC):** Provides a cool, low-fatigue canvas that allows card-based content to stand out with minimal effort.
- **Neutrals:** A scale of Grays from Slate-50 to Slate-900 is used for text hierarchy, borders, and secondary iconography.

## Typography
The system utilizes a dual-font approach optimized for Arabic script legibility. **IBM Plex Sans Arabic** is used for headlines and functional labels due to its structured, geometric clarity which aids in quick information scanning. **Noto Sans Arabic** is employed for body text, offering a humanist touch that remains highly readable across long property descriptions or legal contracts.

Text is always right-aligned by default. For numerical data (currency, areas, unit numbers), tabular lining figures are preferred to ensure alignment in property tables.

## Layout & Spacing
The layout follows a **12-column fluid grid** for desktop and a **4-column grid** for mobile. A strict 4px baseline grid ensures vertical rhythm. 

### Spacing Principles
- **RTL Integrity:** Margins and paddings are mirrored for Arabic. `padding-right` on an icon in an English context becomes `padding-left` here.
- **Information Density:** Large property management dashboards use "Comfortable" spacing for overview pages and "Compact" spacing for data-heavy management tables.
- **Hierarchy through Gap:** Use larger gaps (24px+) to separate distinct property sections and smaller gaps (8px-12px) for related attributes within a card.

## Elevation & Depth
In this Flat 2.0 system, depth is communicated through **subtle ambient shadows and tonal layering** rather than heavy gradients.

- **Level 0 (Background):** Slate-50 (#F8FAFC).
- **Level 1 (Cards/Surface):** Pure White (#FFFFFF) with a 1px border in Slate-200.
- **Level 2 (Dropdowns/Modals):** Pure White with a soft, diffused shadow (Box-shadow: `0 4px 12px rgba(30, 58, 138, 0.08)`).
- **Interactivity:** Hovering over a property card should result in a slight elevation increase (moving from a 1px border to a subtle shadow) to provide immediate feedback.

## Shapes
The shape language is **Soft (0.25rem / 4px)**. This choice strikes a balance between the precision of architecture and the approachability of modern software. 

- **Primary Components:** Buttons and Input fields use a 4px radius.
- **Containers:** Property cards and dashboard widgets use **rounded-lg (8px)** to distinguish them from smaller UI elements.
- **Status Pills:** Success and availability badges use a full **rounded-pill** radius to differentiate them from interactive buttons.

## Components
### Buttons
- **Primary:** Solid #1E3A8A with white text. High contrast for main calls to action like "Add Property" or "Generate Report".
- **Secondary:** Outlined with 1px Slate-300. Used for "Edit" or "Filter" actions.

### Cards
Cards are the primary unit of the UI. Each card must have a subtle 1px border (#E2E8F0) and a white background. Header sections within cards should have a light Slate-50 background tint to separate titles from content.

### Inputs & Selects
Form fields feature a prominent focus state using a 2px Primary Blue border and a soft blue glow. Label placement is strictly top-right above the input field for Arabic RTL flow.

### Real Estate Specific Components
- **Property Status Badges:** Compact pills using #10B981 (Available), #F59E0B (Reserved), and #EF4444 (Occupied).
- **Metric Tiles:** Large-format numbers for "Total Revenue" or "Occupancy Rate" with clear trend indicators (+/- percentages) in the bottom-left of the tile.
- **Unit Navigation:** A vertical sidebar or tab system that allows quick switching between different floors or buildings.