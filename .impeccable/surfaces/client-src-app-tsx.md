---
version: 1
slug: "client-src-app-tsx"
primary_target: "client/src/App.tsx"
related_targets: []
---

# Index — Connection & Explorer

<!-- impeccable:surface-schema 1 -->

## Scope

The primary surface: connection management form, saved connections list, bucket explorer with object table. This is the only surface in the application.

## Mode

Operate — the visitor completes a task. A developer/S3 power user connects to an S3-compatible API, browses buckets, and inspects/manages objects.

## Direction contract

THESIS: An S3 browser is file management, not signal detection. This surface refuses the radio-astronomy instrument metaphor (channels, frequencies, calibration, dual-neon phosphor/amber) and commits to a quiet console: plain language (Connections, Buckets, Objects), stepped sections, and progressive disclosure so a first-time user reaches buckets in under 30 seconds.

OWN-WORLD: Neutral dark slate ground (#090B0F), elevated cards (#10141B / #151A23), hairline borders (#232B38), one blue accent (#5B8CFF) for primary actions and selection, green reserved for connected status only, red for danger. System UI sans (Inter stack) for all interface text; JetBrains Mono only for machine values (keys, sizes, URLs, endpoints). 8-10px card radius, 6px inputs, generous 24-32px card padding, 13px semibold section titles with muted descriptions, no uppercase micro-labels except table headers.

STORY: A user lands on a calm dashboard. Left: a Connect card walks Provider → Endpoint → Credentials → Advanced (collapsed). Right: Saved connections as plain cards, plus a short safety note and what-happens-next hint. On connect, the workspace resolves into a familiar console: buckets nav on the left with search, objects table on the right with breadcrumb, search filter, and a contextual bulk bar. Every action names its outcome; every empty state teaches the next step.

FIRST VIEWPORT: 56px header — bucket mark + "S3 Tester" + muted "Console" tag on the left; connection status pill + Back/Disconnect on the right. Connections view: centered 1120px dashboard grid (minmax 640px form + 320px aside). Explorer view: 264px buckets sidebar (search, count, New bucket button) + main column with bucket header block (name, endpoint meta, object count, Upload / New folder / Share URL actions), breadcrumb + filter row, then a clean table (Name, Size, Modified, row-hover actions). Primary action sits at the end of the Connect card (full-width Connect button) and top-right of the bucket header (Upload).

FORM: Quiet Console minimal dark (user-pinned over roll bf9d8876; grounded minimal-console direction chosen for Operate clarity and the user's dark-minimal-refined + dashboard + free-scope answers).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
