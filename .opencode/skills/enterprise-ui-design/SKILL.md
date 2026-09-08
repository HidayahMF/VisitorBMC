---
name: enterprise-ui-design
description: Design and review professional enterprise and internal-tool interfaces with strong hierarchy, density, consistency, accessibility, and responsive behavior. Use when creating, redesigning, or reviewing application UI.
---

# Enterprise UI Design

Design interfaces as intentional enterprise software, not generic SaaS templates.

## Core principles

Prioritize:

- clear information hierarchy
- operational efficiency
- predictable navigation
- appropriate information density
- consistent spacing rhythm
- restrained visual styling
- readable data tables
- clear primary and secondary actions
- accessible interaction states
- responsive layouts

## Enterprise interface rules

Internal tools should optimize for task completion rather than visual spectacle.

Prefer:

- compact but readable layouts
- subtle borders
- restrained shadows
- clear section hierarchy
- semantic status colors
- consistent typography
- predictable controls
- desktop tables for dense datasets
- mobile stacked layouts where necessary

Avoid:

- excessive card nesting
- excessive whitespace
- giant headings
- decorative elements without purpose
- excessive rounded corners
- excessive shadows
- gradients without functional purpose
- unnecessary animations
- excessive pill-shaped controls

## Before changing UI

1. Inspect the existing implementation.
2. Identify what already works.
3. Identify hierarchy, spacing, density, alignment, and usability problems.
4. Preserve good patterns.
5. Explain why structural changes are necessary before making large redesigns.

Do not redesign business logic merely to improve presentation.

## Design system consistency

Reuse consistent:

- spacing
- typography
- radius
- borders
- shadows
- buttons
- inputs
- tables
- status badges
- dialogs
- navigation states
- empty states
- loading states
- error states

Do not invent a new visual treatment for every page.

## Responsive behavior

Explicitly consider:

- 360px
- 768px
- 1366px
- 1920px

Desktop should preserve useful information density.

Mobile should prioritize important information and actions without requiring unnecessary horizontal scrolling.

## Accessibility

Always consider:

- semantic HTML
- keyboard navigation
- visible focus
- contrast
- labels
- error associations
- dialog focus management
- accessible navigation states
