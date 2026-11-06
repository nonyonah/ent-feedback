# 002 — Respect input and motion preferences

- **Status**: DONE
- **Commit**: b300ef4
- **Severity**: MEDIUM
- **Category**: Accessibility and frequency
- **Estimated scope**: shared UI primitives and global CSS, under 200 lines

## Problem

src/components/ui/sheet.tsx:92: Sheets, tooltips and switch thumbs move despite reduced-motion preference. Keyboard actions should be immediate.

```tsx
transition-[opacity,translate] duration-200 ease-in-out
```

## Target

Install client document input-modality tracking. Keyboard transitions immediate; pointer resets mode. Reduced motion keeps125ms opacity and removes scale/translate motion. Command popup always immediate.

## Repo conventions to follow

BaseUI data-starting-style/data-ending-style and data-slot attributes identify component states. Existing example: src/components/ui/dialog.tsx:89 uses origin-center and scale98. Global tokens belong in src/app/globals.css :root.

## Steps

1. Create src/components/ui/motion-policy.tsx using useEffect event cleanup; mount once in src/app/layout.tsx. Scope policy CSS to shared slots. Disable layout transitions on sidebar rather than animating width.
2. Keep transition targets explicit and remove stale utility declarations where replaced by the shared policy.
3. Run the verification commands below.

## Boundaries

Do not edit account/settings data logic, user icons, select/combobox/autocomplete/calendar/accordion files, or feedback composer no-hover/no-outline behavior. No dependencies. Changes to root layout only mount the motion policy. If original evidence differs before implementation, report drift before editing.

## Verification

- **Mechanical**: `npx tsc --noEmit`; `npx eslint src/components/ui/motion-policy.tsx src/components/ui/dialog.tsx src/components/ui/popover.tsx src/components/ui/tooltip.tsx src/components/ui/sheet.tsx src/components/ui/toast.tsx src/app/layout.tsx` must pass.
- **Feel check**: Open/close dialog, menu and toast twice rapidly. At10% playback inspect origin and opacity for jumps. Keyboard-open menus and search must appear immediately. Emulate reduced motion: no scale/slide but short fade remains. Public feedback inputs retain no outline/hover motion.
- **Done when**: no layout properties transition in these shared primitives, no toast replay keyframes, keyboard and reduced-motion rules apply without changing focus behavior.
