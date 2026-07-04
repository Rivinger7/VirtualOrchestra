# Frontend Architecture

## Purpose

This project separates:

- visual UI implementation
  from
- business logic implementation

AI handles:

- UI
- TailwindCSS
  - Angular UI composition
- layout
- responsiveness
- animations

Developer handles:

- Angular logic
- services
- API integration
- stores
- architecture
- business rules

## Component Philosophy

Components should:

- focus on presentation
- remain visually clean
- avoid business complexity

## Preferred Structure

components/
ui/
shared/
sections/

pages/

layouts/

## Angular Guidelines

Keep component logic minimal.

Use:

- placeholder data
- simple @Input() and minimal component state

Avoid:

- heavy logic
- API fetching inside components
- large services doing UI work
