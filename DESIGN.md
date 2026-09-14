---
name: S3 Tester
description: A quiet dark console for S3 object storage
colors:
  bg: "#090B0F"
  surface: "#10141B"
  surface-2: "#151A23"
  inset: "#0B0E14"
  border: "#222A38"
  border-strong: "#303A4E"
  text: "#E8ECF3"
  text-2: "#A6B0C2"
  text-3: "#6B7689"
  accent: "#5B8CFF"
  accent-hover: "#739DFF"
  success: "#3FB96B"
  danger: "#E5484D"
typography:
  ui:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    fontVariantNumeric: tabular-nums
rounded:
  r-sm: "6px"
  r-md: "10px"
  r-lg: "14px"
spacing:
  card-pad: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.r-sm}"
    padding: "12px 20px"
  button-outline:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.r-sm}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.inset}"
    textColor: "{colors.text}"
    rounded: "{rounded.r-sm}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.r-lg}"
---

## Overview

**Quiet Console** is a minimal dark console for developer tools. It treats the interface as a calm workspace: plain language, stepped sections, and progressive disclosure. The ground is a neutral near-black (`#090B0F`). Cards lift one step (`#10141B`) with hairline borders (`#222A38`). One blue accent (`#5B8CFF`) owns primary actions and selection; green is reserved for connected status, red for danger. Nothing else competes for attention.

Replaces the former Signal Analysis instrument world. Mode: Operate.

## Colors

Three layers, one accent:

- **Ground & surfaces** — `--bg`, `--surface`, `--surface-2`, `--inset`. Neutral slate, no blue cast. Cards sit on the ground with a hairline border; inputs recess into `--inset`.
- **Borders** — `--border`, `--border-strong`. Hairlines for structure, stronger for hover and focus containers.
- **Text** — `--text` through `--text-4`. Primary content brightest; `--text-4` is the quietest permitted value.

Semantic roles:

- **Accent** (`--accent`, `--accent-hover`, `--accent-active`) — blue. Primary buttons, selected bucket, selected rows, links, focus rings. Backgrounds use `--accent-bg`; borders use `--accent-line`.
- **Success** (`--success`) — green. Connected dot and success notifications only.
- **Danger** (`--danger`, `--danger-hover`) — red. Destructive actions and errors.

**Strategy: Restrained.** Blue carries primary action and selection; it never decorates. Status colors appear only on status.

## Typography

- **Inter system stack** — all interface text: headings, labels, buttons, body, descriptions. Tight tracking (-0.01 to -0.02em) on headings.
- **JetBrains Mono** — machine values only: object keys, sizes, endpoints, URLs, bucket names in headers. Self-hosted as woff2.

**Scale:** Fixed rem. `--fs-xs` (12px) through `--fs-xl` (22px). Section titles 13px semibold with muted descriptions; table headers 11px caps.

**Rules:** Sentence case everywhere except table headers. Mono never used for prose or labels.

## Layout

- **Connections:** centered 1120px dashboard. Form card (flex) + 320px aside (saved connections, safety note, next-steps).
- **Explorer:** 264px buckets sidebar (search, count, New bucket) + main column (bucket header block, breadcrumb + filter row, table card).
- **Header:** 56px, status pill for the active connection, connection switcher when 2+ connections.
- **Responsive:** ≤1024px the dashboard stacks; ≤900px the explorer stacks with a capped sidebar; ≤640px single-column fields, hidden Modified column.

## Elevation & Depth

Flat. Depth comes from ground → card → inset steps plus hairline borders. No shadows except modals and notifications.

## Shapes

- **Corners:** `--r-sm` (6px) inputs and small buttons, `--r-md` (10px) cards and table wraps, `--r-lg` (14px) top-level cards and modals.
- **Focus rings:** 2px solid `--accent` with soft outer glow on inputs.
- **Selection:** translucent blue with white text.
- **Scrollbars:** thin, `--border-strong` thumb on transparent track.

## Components

### Buttons (`.btn`)

| Variant | Background | Text | Border |
|---|---|---|---|
| Primary | `--accent` | white | `--accent` |
| Outline | `--surface-2` | `--text-2` | `--border` |
| Ghost | transparent | `--text-2` | transparent |
| Danger | `--danger-bg` | `#f27b7f` | `--danger-line` |

Sizes: sm (7px 12px), default (10px 16px), lg (12px 20px). Icon buttons 30×30px.

### Inputs (`.input`)

Inset background, hairline border. Hover strengthens border. Focus: accent border + soft ring. `.mono` variant for machine values. Search variants with left icon.

### Stepped form (`.form-section`)

Numbered steps (Provider → Endpoint → Credentials) with title + description. Advanced settings collapsed in `<details>`. Presets are a 2-column grid of name + description buttons.

### Cards (`.card`, `.mini-card`, `.conn-card`)

Card: surface, hairline border, 14px radius, 20–24px padding. Saved connections are compact cards with name, bucket count badge, endpoint meta, Open/Remove actions.

### Bucket sidebar

Search field, count in the title, hover-reveal delete. Active bucket: accent tint + accent border.

### Bucket header (`.bucket-head`)

Mono bucket name, meta line (object count · endpoint · prefix), Upload / New folder actions top-right.

### Object table (`.object-table`)

Sticky header in `--surface-2` with 11px caps labels. Row-hover reveals actions (preview, download, share, delete). Selected rows get accent tint. Bulk bar appears above the table when files are selected.

### Modals (`.modal`)

Centered overlay with blur. Title + plain-language description + labeled field. 460px default, 620px wide variant.

### Notifications

Top-center pills with status dot. Green-tinted success, red-tinted error.

## Do's and Don'ts

- **Do** use plain product language: Connections, Buckets, Objects, Share.
- **Do** collapse advanced settings (session token, path style, checksums, persistence) behind a disclosure.
- **Do** reveal row actions on hover; keep tables scannable.
- **Do** use mono only for machine values.
- **Don't** use uppercase micro-labels outside table headers.
- **Don't** use green/amber as decoration — green means connected/success, blue means action/selection.
- **Don't** use emoji for icons — drawn SVG at 1.5px stroke.
- **Don't** add shadows outside modals and notifications.
