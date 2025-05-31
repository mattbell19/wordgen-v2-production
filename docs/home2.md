# Home2 Page Documentation

## Overview
Home2 is an alternative landing page design featuring a full-screen background image with split floating navigation boxes and left-aligned hero content.

## Key Components

### Navigation Bar
- Fixed position at the top of the page
- Split into two floating white boxes with rounded corners and shadow
- Left box:
  - Contains logo and main navigation items
  - Includes Product and Resources with dropdown indicators
  - Pricing link
- Right box:
  - Contains all action items
  - Contact sales, Sign in, View demo buttons
  - Start free trial button with black background
- Both boxes have:
  - White background
  - Rounded corners (rounded-full)
  - Shadow effect for floating appearance
  - Positioned at screen edges
  - Ghost variant buttons with gray text

### Hero Section
- Left-aligned content with maximum width of 1200px
- Large headline (text-[90px]) with distinctive layout:
  ```
  The new age
  of content creation
                 is AI-first
  ```
  - Uses Sora-ExtraBold font from assets folder
  - Line height of 0.85 and tight tracking for compact layout
  - "is AI-first" is indented to align with the end of "creation"
- Descriptive paragraph about AI-first platform
  - Uses Literata-Light font from assets folder
  - Maintains 90% opacity for subtle contrast
- Two prominent call-to-action buttons: View demo and Start free trial

### Background
- Full-screen background image (`bg1.jpg`)
- Image should be placed in the public/images directory
- Uses slate-800 background color with 70% opacity overlay
- Background image settings:
  - cover size
  - center position
  - no-repeat
  - Inset box shadow for consistent overlay

## Styling Notes
- Uses Tailwind CSS for all styling
- Left-aligned layout with appropriate padding
- Z-index layering to ensure proper content visibility
- Typography uses custom fonts (Sora-ExtraBold for headings)
- Precise spacing and alignment for heading layout

## Implementation Requirements
1. Background image must be placed in: `/public/images/bg1.jpg`
2. Navigation uses fixed positioning for proper floating effect
3. Content uses relative positioning with z-index for proper layering
4. Sora-ExtraBold font must be available in assets folder

## Usage
Access the page at the `/home2` route. This alternative homepage can be used for A/B testing or as a replacement for the default homepage.
