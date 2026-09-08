---
name: visual-ui-qa
description: Perform visual QA after frontend implementation by reviewing rendered screens for alignment, spacing, hierarchy, overflow, responsive behavior, and visual inconsistencies. Use after significant UI changes.
---

# Visual UI QA

Do not declare a UI task complete based only on code, tests, or DOM structure.

Inspect the rendered result whenever browser or screenshot capabilities are available.

## Review

Check:

- alignment
- spacing rhythm
- typography hierarchy
- component density
- container width
- text wrapping
- clipping
- overflow
- navigation density
- icon alignment
- button alignment
- card heights
- table readability
- status visibility
- empty space balance
- hover states
- active states
- focus states

## Responsive QA

Review independently at:

- 360px
- 768px
- 1366px
- 1920px

Do not assume a desktop layout works on mobile merely because CSS contains media queries.

## Navigation QA

Check:

- no unexpected wrapping
- active route is correct
- inactive hover is visible
- dropdown positioning
- long usernames
- role-specific navigation
- mobile menu
- keyboard navigation

## Data-heavy UI

On desktop:

Prefer readable tables when comparison across rows matters.

On mobile:

Use stacked/card presentation when tables would make critical information or actions inaccessible.

Do not remove important information simply to fit the viewport.

## Completion rule

After implementation:

1. Render.
2. Inspect.
3. Identify visible defects.
4. Fix them.
5. Render again.
6. Only then report the UI task complete.

If browser or screenshot access is unavailable, explicitly report that visual QA remains unverified.
