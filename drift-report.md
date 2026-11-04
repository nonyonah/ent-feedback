## Design token drift report

Checked **99** Figma tokens (variables (bridge)) against **16** codebase tokens (css) at 2026-11-04T15:38:57.348Z.

### Summary

| Check | Count |
|---|---|
| Value mismatches (same name, different value) | 0 |
| Missing in code (in Figma, not in the codebase) | 66 |
| Missing in Figma (in the codebase, not in Figma) | 16 |
| Components in code, not in Figma (never synced) | 69 |
| **Total drift** | **151** |

### Missing in code

| Token | Category | Value (Figma) |
|---|---|---|
| `color-background` | color | `#ffffff` |
| `color-foreground` | color | `#0a0a0a` |
| `color-card` | color | `#ffffff` |
| `color-card-foreground` | color | `#0a0a0a` |
| `color-popover` | color | `#ffffff` |
| `color-popover-foreground` | color | `#0a0a0a` |
| `color-primary` | color | `#2563eb` |
| `color-primary-foreground` | color | `#eff6ff` |
| `color-secondary` | color | `#f5f5f5` |
| `color-secondary-foreground` | color | `#171717` |
| `color-muted` | color | `#f5f5f5` |
| `color-muted-foreground` | color | `#737373` |
| `color-accent` | color | `#f5f5f5` |
| `color-accent-foreground` | color | `#171717` |
| `color-destructive` | color | `#e7000b` |
| `color-border` | color | `#e5e5e5` |
| `color-input` | color | `#e5e5e5` |
| `color-ring` | color | `#60a5fa` |
| `color-sidebar` | color | `#fafafa` |
| `color-sidebar-foreground` | color | `#0a0a0a` |
| `color-sidebar-accent` | color | `#f5f5f5` |
| `color-sidebar-border` | color | `#e5e5e5` |
| `color-status-open-bg` | color | `#f4f4f5` |
| `color-status-open-fg` | color | `#52525b` |
| `color-status-planned-bg` | color | `#e8f0fe` |
| `color-status-planned-fg` | color | `#1d4ed8` |
| `color-status-progress-bg` | color | `#fff4db` |
| `color-status-progress-fg` | color | `#b45309` |
| `color-status-shipped-bg` | color | `#e6f6ec` |
| `color-status-shipped-fg` | color | `#15803d` |
| `color-vote-active-bg` | color | `#2563eb1f` |
| `color-vote-active-border` | color | `#2563eb` |
| `color-success` | color | `#16a34a` |
| `radius-sm` | radius | `6px` |
| `radius-md` | radius | `8px` |
| `radius-lg` | radius | `10px` |
| `radius-xl` | radius | `14px` |
| `radius-full` | radius | `999px` |
| `space-1` | spacing | `4px` |
| `space-2` | spacing | `8px` |
| `space-3` | spacing | `12px` |
| `space-4` | spacing | `16px` |
| `space-5` | spacing | `20px` |
| `space-6` | spacing | `24px` |
| `space-8` | spacing | `32px` |
| `space-10` | spacing | `40px` |
| `space-12` | spacing | `48px` |
| `space-16` | spacing | `64px` |
| `size-control-sm` | typography | `32px` |
| `size-control-md` | typography | `40px` |
| `size-control-lg` | typography | `48px` |
| `size-tap-min` | typography | `44px` |
| `size-vote-width` | typography | `48px` |
| `size-vote-height` | typography | `56px` |
| `size-avatar-sm` | typography | `24px` |
| `size-avatar-md` | typography | `32px` |
| `size-avatar-lg` | typography | `40px` |
| `size-board-max` | typography | `720px` |
| `size-dashboard-max` | typography | `1200px` |
| `size-widget-width` | typography | `380px` |
| `size-widget-height` | typography | `560px` |
| `size-launcher` | typography | `48px` |
| `font-family` | typography | `Inter` |
| `font-weight-regular` | typography | `400px` |
| `font-weight-medium` | typography | `500px` |
| `font-weight-semibold` | typography | `600px` |

### Missing in Figma

New in code: never in Figma, or removed from Figma without being marked deprecated.

| Token | Category | Value (code) |
|---|---|---|
| `font-sans` | typography | `var(--font-sans)` |
| `font-mono` | typography | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` |
| `font-heading` | typography | `var(--font-sans)` |
| `radius` | radius | `10px` |
| `success` | color | `#16a34a` |
| `success-foreground` | color | `#15803d` |
| `status-open-bg` | color | `#f4f4f5` |
| `status-open-fg` | color | `#52525b` |
| `status-planned-bg` | color | `#e8f0fe` |
| `status-planned-fg` | color | `#1d4ed8` |
| `status-progress-bg` | color | `#fff4db` |
| `status-progress-fg` | color | `#b45309` |
| `status-shipped-bg` | color | `#e6f6ec` |
| `status-shipped-fg` | color | `#15803d` |
| `vote-active-bg` | color | `#2563eb1f` |
| `vote-active-border` | color | `#2563eb` |

### Components in code, not in Figma

These components exist in code but have no Figma counterpart.

| Component | codeKey | Detail |
|---|---|---|
| `board-feedback-row` | `src/components/feedback/board-feedback-row.tsx#board-feedback-row` | never synced by elf-batch |
| `board-view` | `src/components/feedback/board-view.tsx#board-view` | never synced by elf-batch |
| `comment-thread` | `src/components/feedback/comment-thread.tsx#comment-thread` | never synced by elf-batch |
| `dashboard-view` | `src/components/feedback/dashboard-view.tsx#dashboard-view` | never synced by elf-batch |
| `empty-state` | `src/components/feedback/empty-state.tsx#empty-state` | never synced by elf-batch |
| `feedback-card` | `src/components/feedback/feedback-card.tsx#feedback-card` | never synced by elf-batch |
| `feedback-provider` | `src/components/feedback/feedback-provider.tsx#feedback-provider` | never synced by elf-batch |
| `filter-bar` | `src/components/feedback/filter-bar.tsx#filter-bar` | never synced by elf-batch |
| `filter-chip` | `src/components/feedback/filter-chip.tsx#filter-chip` | never synced by elf-batch |
| `item-detail` | `src/components/feedback/item-detail.tsx#item-detail` | never synced by elf-batch |
| `site-header` | `src/components/feedback/site-header.tsx#site-header` | never synced by elf-batch |
| `status-tag` | `src/components/feedback/status-tag.tsx#status-tag` | never synced by elf-batch |
| `submit-dialog` | `src/components/feedback/submit-dialog.tsx#submit-dialog` | never synced by elf-batch |
| `vote-button` | `src/components/feedback/vote-button.tsx#vote-button` | never synced by elf-batch |
| `widget` | `src/components/feedback/widget.tsx#widget` | never synced by elf-batch |
| `accordion` | `src/components/ui/accordion.tsx#accordion` | never synced by elf-batch |
| `alert-dialog` | `src/components/ui/alert-dialog.tsx#alert-dialog` | never synced by elf-batch |
| `alert` | `src/components/ui/alert.tsx#alert` | never synced by elf-batch |
| `autocomplete` | `src/components/ui/autocomplete.tsx#autocomplete` | never synced by elf-batch |
| `avatar` | `src/components/ui/avatar.tsx#avatar` | never synced by elf-batch |
| `badge` | `src/components/ui/badge.tsx#badge` | never synced by elf-batch |
| `breadcrumb` | `src/components/ui/breadcrumb.tsx#breadcrumb` | never synced by elf-batch |
| `button` | `src/components/ui/button.tsx#button` | never synced by elf-batch |
| `calendar` | `src/components/ui/calendar.tsx#calendar` | never synced by elf-batch |
| `checkbox-group` | `src/components/ui/checkbox-group.tsx#checkbox-group` | never synced by elf-batch |
| `checkbox` | `src/components/ui/checkbox.tsx#checkbox` | never synced by elf-batch |
| `collapsible` | `src/components/ui/collapsible.tsx#collapsible` | never synced by elf-batch |
| `combobox` | `src/components/ui/combobox.tsx#combobox` | never synced by elf-batch |
| `command` | `src/components/ui/command.tsx#command` | never synced by elf-batch |
| `composer` | `src/components/ui/composer.tsx#composer` | never synced by elf-batch |
| `context-menu` | `src/components/ui/context-menu.tsx#context-menu` | never synced by elf-batch |
| `dialog` | `src/components/ui/dialog.tsx#dialog` | never synced by elf-batch |
| `drawer` | `src/components/ui/drawer.tsx#drawer` | never synced by elf-batch |
| `empty` | `src/components/ui/empty.tsx#empty` | never synced by elf-batch |
| `field` | `src/components/ui/field.tsx#field` | never synced by elf-batch |
| `fieldset` | `src/components/ui/fieldset.tsx#fieldset` | never synced by elf-batch |
| `form` | `src/components/ui/form.tsx#form` | never synced by elf-batch |
| `frame` | `src/components/ui/frame.tsx#frame` | never synced by elf-batch |
| `group` | `src/components/ui/group.tsx#group` | never synced by elf-batch |
| `input-group` | `src/components/ui/input-group.tsx#input-group` | never synced by elf-batch |
| `input` | `src/components/ui/input.tsx#input` | never synced by elf-batch |
| `kbd` | `src/components/ui/kbd.tsx#kbd` | never synced by elf-batch |
| `menu` | `src/components/ui/menu.tsx#menu` | never synced by elf-batch |
| `meter` | `src/components/ui/meter.tsx#meter` | never synced by elf-batch |
| `number-field` | `src/components/ui/number-field.tsx#number-field` | never synced by elf-batch |
| `otp-field` | `src/components/ui/otp-field.tsx#otp-field` | never synced by elf-batch |
| `pagination` | `src/components/ui/pagination.tsx#pagination` | never synced by elf-batch |
| `popover` | `src/components/ui/popover.tsx#popover` | never synced by elf-batch |
| `preview-card` | `src/components/ui/preview-card.tsx#preview-card` | never synced by elf-batch |
| `progress` | `src/components/ui/progress.tsx#progress` | never synced by elf-batch |
| `radio-group` | `src/components/ui/radio-group.tsx#radio-group` | never synced by elf-batch |
| `scroll-area` | `src/components/ui/scroll-area.tsx#scroll-area` | never synced by elf-batch |
| `segmented-control` | `src/components/ui/segmented-control.tsx#segmented-control` | never synced by elf-batch |
| `select` | `src/components/ui/select.tsx#select` | never synced by elf-batch |
| `separator` | `src/components/ui/separator.tsx#separator` | never synced by elf-batch |
| `sheet` | `src/components/ui/sheet.tsx#sheet` | never synced by elf-batch |
| `sidebar` | `src/components/ui/sidebar.tsx#sidebar` | never synced by elf-batch |
| `skeleton` | `src/components/ui/skeleton.tsx#skeleton` | never synced by elf-batch |
| `slider` | `src/components/ui/slider.tsx#slider` | never synced by elf-batch |
| `spinner` | `src/components/ui/spinner.tsx#spinner` | never synced by elf-batch |
| `switch` | `src/components/ui/switch.tsx#switch` | never synced by elf-batch |
| `table` | `src/components/ui/table.tsx#table` | never synced by elf-batch |
| `tabs` | `src/components/ui/tabs.tsx#tabs` | never synced by elf-batch |
| `textarea` | `src/components/ui/textarea.tsx#textarea` | never synced by elf-batch |
| `toast` | `src/components/ui/toast.tsx#toast` | never synced by elf-batch |
| `toggle-group` | `src/components/ui/toggle-group.tsx#toggle-group` | never synced by elf-batch |
| `toggle` | `src/components/ui/toggle.tsx#toggle` | never synced by elf-batch |
| `toolbar` | `src/components/ui/toolbar.tsx#toolbar` | never synced by elf-batch |
| `tooltip` | `src/components/ui/tooltip.tsx#tooltip` | never synced by elf-batch |
