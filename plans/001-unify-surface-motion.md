# 001 — Unify surface motion

- **Status**: DONE
- **Commit**: b300ef4
- **Severity**: HIGH
- **Category**: Performance and cohesion
- **Estimated scope**: shared UI primitives and global CSS, under 200 lines

## Problem

src/components/ui/popover.tsx:54: Shared popovers and tooltips animate layout properties; backdrops use transition-all.

```tsx
transition-[top,left,right,bottom,transform]
```

## Target

Use opacity and scale only for anchored surfaces: 200ms cubic-bezier(0.23,1,0.32,1), origin var(--transform-origin), initial scale .97. Modal 250ms same curve, sheet 250ms cubic-bezier(0.32,0.72,0,1). Exit125ms. Positioners never interpolate.

## Repo conventions to follow

BaseUI data-starting-style/data-ending-style and data-slot attributes identify component states. Existing example: src/components/ui/dialog.tsx:89 uses origin-center and scale98. Global tokens belong in src/app/globals.css :root.

## Steps

1. Edit shared surface classes and append global motion tokens and data-slot rules. Include pointer press scale .97 at160ms; preserve composer exclusion.
2. Keep transition targets explicit and remove stale utility declarations where replaced by the shared policy.
3. Run the verification commands below.

## Boundaries

Do not edit account/settings data logic, user icons, select/combobox/autocomplete/calendar/accordion files, or feedback composer no-hover/no-outline behavior. No dependencies. Changes to root layout only mount the motion policy. If original evidence differs before implementation, report drift before editing.

## Verification

- **Mechanical**: `npx tsc --noEmit`; `npx eslint src/components/ui/motion-policy.tsx src/components/ui/dialog.tsx src/components/ui/popover.tsx src/components/ui/tooltip.tsx src/components/ui/sheet.tsx src/components/ui/toast.tsx src/app/layout.tsx` must pass.
- **Feel check**: Open/close dialog, menu and toast twice rapidly. At10% playback inspect origin and opacity for jumps. Keyboard-open menus and search must appear immediately. Emulate reduced motion: no scale/slide but short fade remains. Public feedback inputs retain no outline/hover motion.
- **Done when**: no layout properties transition in these shared primitives, no toast replay keyframes, keyboard and reduced-motion rules apply without changing focus behavior.
