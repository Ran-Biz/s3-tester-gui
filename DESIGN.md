---
name: S3 Tester
description: A signal-analysis workstation for S3 object storage
colors:
  void: "#060913"
  panel: "#0b1120"
  panel-2: "#0e1526"
  panel-3: "#111a2e"
  line: "#1c2538"
  line-2: "#2a3550"
  line-3: "#3a4668"
  ink: "#dce4f2"
  ink-2: "#8b9dc3"
  ink-3: "#75829f"
  ink-4: "#4a5470"
  signal: "#4ae54a"
  signal-2: "#7cf07c"
  signal-dim: "#2f8f34"
  tuner: "#e0a92c"
  tuner-2: "#f0c25c"
  tuner-dim: "#8f6c1a"
  alert: "#ff5c6c"
  alert-2: "#ff8592"
typography:
  ui:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  ui-label:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.1em"
    textTransform: uppercase
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    fontVariantNumeric: tabular-nums
rounded:
  r-1: "2px"
  r-2: "4px"
  r-3: "6px"
spacing:
  u: "4px"
components:
  button-primary:
    backgroundColor: "{colors.tuner}"
    textColor: "{colors.void}"
    rounded: "{rounded.r-2}"
    padding: "10px 16px"
  button-outline:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.r-2}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.void}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r-2}"
    padding: "10px 12px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.r-3}"
---

## Overview

**Signal Analysis** is a deep-space-vacuum design system for developer tools. It treats the interface as a scientific instrument: every element is a reading, every interaction is a measurement. The ground is the deepest void (`#060913`). Two instrument channels carry information: **phosphor green** for data, measurements, paths, and code; **tuner amber** for operations, selections, and primary actions. The system refuses decoration. If it does not convey state, navigation, or data, it does not render.

Born from the radio astronomy / Deep Space Network control room direction. Mode: Operate.

## Colors

The palette is split into three layers:

- **Void & Surfaces** — the deep field (`--void`, `--panel`, `--panel-2`, `--panel-3`). Each step is a slightly lifted navy-black. The void is the ground; panels are instrument housings. Never use pure black.
- **Rules** — `--line` through `--line-3`. Hairlines at increasing opacity. Used for borders, dividers, table rules, and the faint grid on measurement surfaces.
- **Ink** — `--ink` through `--ink-4`. Readout text at four levels. The brightest (`#dce4f2`) is reserved for primary content; `--ink-4` (`#4a5470`) is the quietest before complete darkness.

Two **signal channels** carry the meaning:

- **Signal** (`--signal`, `--signal-2`, `--signal-dim`) — phosphor green. Data, file paths, sizes, keys, timestamps, folders. The spectrogram channel. Backgrounds use `--signal-bg` (`rgba(74,229,74,0.08)`); borders use `--signal-line` (`rgba(74,229,74,0.32)`).
- **Tuner** (`--tuner`, `--tuner-2`, `--tuner-dim`) — amber. Primary actions, active selection, connection indicators. The operator channel. Backgrounds use `--tuner-bg` (`rgba(224,169,44,0.09)`); borders use `--tuner-line` (`rgba(224,169,44,0.36)`).
- **Alert** (`--alert`, `--alert-2`) — red for destructive actions and errors.

**Strategy: Restrained.** One accent carries 5-15% of any screen. The signal channel owns data; the tuner channel owns action. Colors never appear as decoration — only on actionable or informative elements.

## Typography

Two families, one role each:

- **Archivo** (variable, 100-900 weight, 100% stretch) — the UI face. Proportional. Labels, headings, button text, body copy, descriptions. Self-hosted as woff2.
- **JetBrains Mono** (variable, 100-800 weight) — the data face. Monospaced. File paths, keys, sizes, IDs, timestamps, form inputs, presigned URLs, toolbars. Self-hosted as woff2.

**Scale:** Fixed rem, not fluid. Steps: `--fs-micro` (11px, labels), `--fs-xs` (12px, side text), `--fs-sm` (13px, body), `--fs-base` (14px, default), `--fs-md` (16px, headings), `--fs-lg` (20px), `--fs-xl` (24px). Ratio between steps is ~1.13-1.17.

**Rules:** Monospace for anything machine-generated or measured. Proportional UI for anything human-authored. Tabular-nums on all data cells. Caps with 0.1-0.16em letter-spacing for section labels and table headers. No display sizes needed — this is a tool, not a publication.

## Layout

- **4px grid.** Every measurement is a multiple of `--u` (4px). Buttons, inputs, spacings, radii all derive from `calc(var(--u) * N)`.
- **Workspace:** Two-panel layout. Left: channel bank (264px, connections). Right: main bay (flex fill).
- **Header:** 52px tall, sticky, instrument ID plate.
- **Explorer:** Two-panel layout. Left: bucket sidebar (248px). Right: toolbar + data table.
- **Responsive:** At ≤900px the channel bank/sidebar collapses to a fixed overlay. At ≤640px field rows go single-column, the last-modified column hides.
- **Breakpoints:** 900px (sidebar collapse), 640px (compact).
- **Max content width:** 860px centered in the calibration view.

## Elevation & Depth

Flat layering. No shadows. Depth is conveyed through background tint steps: `--void` → `--panel` → `--panel-2` → `--panel-3`. Modals add a single dark overlay with slight backdrop blur. The toolbar sits on `--panel`, the table header on `--panel-2`, both above the void content area. No box-shadows anywhere except the modal and notification, which are chromium shadows for separation from the instrument surface.

## Shapes

- **Corners:** Tight instrument radii. `--r-1` (2px) for subtle rules, `--r-2` (4px) for buttons/inputs, `--r-3` (6px) for panels and modals.
- **Focus rings:** 1.5px solid `--tuner` with 2px offset on `:focus-visible`. No glow, no spread.
- **Selection:** `::selection` in `--tuner-line` (semi-transparent amber) with white text.
- **Scrollbars:** Thin, themed. `--line-2` thumb on transparent track.

## Components

### Buttons (`.btn`)

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| Primary | `--tuner` | `--void` | `--tuner` | `--tuner-2` |
| Outline | `--panel-2` | `--ink-2` | `--line-2` | bg→`--panel-3`, text→`--ink` |
| Ghost | transparent | `--ink-3` | transparent | bg→`--panel-2`, text→`--ink` |
| Danger | `--alert-bg` | `--alert-2` | `--alert-line` | bg deepened |
| Danger solid | `--alert` | white | `--alert` | `--alert-2` |

Sizes: `--btn-sm` (8px 12px), default (10px 16px), `--btn-lg` (12px 20px). Icon buttons are 28×28px grid cells with a transparent-to-panel hover transition. Disabled: 40% opacity, no pointer.

### Inputs (`.input`)

Mono font, void background, line-2 border. Hover lightens border to line-3. Focus: tuner border, tuner-bg shadow ring, panel-2 background. Placeholder: ink-3 at 75% opacity.

### Radio cards (`.radio-card`)

Void background, line border. Checked state: signal-line border, signal-bg background. Custom radio dot rendered in CSS. Two cards with name + description.

### Panels (`.panel`)

Panel background, line-2 border, r-3 radius. Head: panel-2 background, bottom rule, title in signal icon + UI font. Body: 20px padding.

### Data table (`.object-table`)

Full-width, collapsed borders. Sticky header in panel-2 with mono caps labels. Rows bordered by line. Hover: panel background. Selected: signal-bg background. Checkboxes are custom 15px signal-colored squares.

### Modals (`.modal`)

Fixed overlay with dark backdrop + 2px blur. Panel housing, 440px max-width (640px wide variant). Modal-in animation: 8px rise + 0.99→1 scale, 180ms ease.

### Notifications

Fixed, centered below header. Mono font, backdrop-blur. Success: signal-tinted; error: alert-tinted.

### Channel bank (`.channel-bank`)

264px sidebar. Frequency bands: transparent by default, panel-2 on hover, tuner-bg + tuner-line border + left tuner accent bar when active. Delete button fades in on hover.

## Do's and Don'ts

- **Do** use mono for file paths, keys, sizes, IDs, timestamps, form inputs.
- **Do** use the signal channel (green) for data, measurements, and file references.
- **Do** use the tuner channel (amber) for actions, selections, and connections.
- **Do** snap every measurement to the 4px grid.
- **Don't** use pure black — the void (`#060913`) is the darkest permitted value.
- **Don't** add box shadows outside modals and notifications.
- **Don't** use emoji for icons — use drawn SVG at 1.5px stroke weight.
- **Don't** introduce a third accent color. Signal + tuner is the complete vocabulary.
- **Don't** animate page-load entrances. Motion is for state transitions (hover, focus, modal in/out), not choreography.
- **Don't** use gradient text, glass/blur as decoration, or colored left-borders on cards.