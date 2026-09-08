---
name: anti-ai-slop-ui
description: Detect and remove generic AI-generated UI patterns. Use when designing, reviewing, or polishing frontend interfaces to make them feel intentional, product-specific, restrained, and professionally designed.
---

# Anti AI-Slop UI Reviewer

Actively detect interfaces that look generically AI-generated.

Do not assume that making something "modern" makes it good.

Ask:

> Would an experienced product designer intentionally make this choice for this specific product?

If not, reconsider it.

## Detect AI-slop patterns

Flag:

- repetitive grids of generic cards
- card-inside-card layouts
- excessive rounded corners
- excessive pill controls
- arbitrary gradients
- decorative blobs and circles
- excessive shadows
- giant empty areas
- oversized headings
- unnecessary icons
- icon + title + description repeated everywhere
- random accent colors
- every section placed inside a container
- every action having equal visual weight
- generic SaaS dashboard layouts
- excessive blue accents
- fake metrics added merely to fill space
- duplicated greetings or labels
- crowded navigation
- unnatural text wrapping
- inconsistent spacing
- excessive animation
- decorative elements with no information value

## Simplify intentionally

When an element has no functional or hierarchical purpose, consider removing it.

Do not add UI merely to make a page look fuller.

Whitespace is useful, but large unused areas should result from deliberate composition rather than generic templates.

## Visual hierarchy

Every screen should make clear:

1. Where am I?
2. What information matters most?
3. What is the primary action?
4. What secondary actions exist?
5. What is the current state?

Avoid making every element equally prominent.

## Internal tools

For operational software:

Efficiency > spectacle.

Prefer:

- information clarity
- useful density
- strong table readability
- obvious statuses
- predictable navigation
- restrained decoration
- compact controls
- clear actions

Do not turn an internal operational tool into a marketing landing page.

## Product-specific design

Before designing:

- understand the product
- understand its users
- understand frequent workflows
- understand the environment where it is used

Design for those constraints rather than applying a generic dashboard template.
