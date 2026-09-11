# Index — Connection & Explorer

<!-- impeccable:surface-schema 1 -->

## Scope

The primary surface: connection management form, saved connections list, bucket explorer with object table. This is the only surface in the application.

## Mode

Operate — the visitor completes a task. A developer/S3 power user connects to an S3-compatible API, browses buckets, and inspects/manages objects.

## Direction contract

**THESIS:** An S3 object browser is fundamentally a signal detection problem — you're scanning the void for the right bucket, tuning into the right prefix, reading object signatures. The category default is a file-manager-in-dark-mode (tree sidebar, icon grid, breadcrumb nav). This surface refuses that and instead commits to the grammar of a radio astronomy / Deep Space Network control room: the interface is a signal analysis workstation where every element is an instrument reading.

**OWN-WORLD:** Deep space void (`#060913`) as ground. Signal green phosphor (`#4AE54A`) for data, measurements, and code paths — the green of a spectrometer readout, not a terminal. Warm amber tuner (`#E0A92C`) for connections, primary actions, and active selection — the amber of a tuning dial locking onto a frequency. Cool slate (`#8B9DC3`) for secondary text. Panel surfaces in deep navy (`#0B1120`). One proportional system sans for UI labels and commands, one monospace for data values, paths, keys, and sizes. Drawn SVG icons at 1.5px stroke weight, consistent across the surface. All interactive elements snap to a 4px pitch grid.

**STORY:** A user lands on a dark, deliberate instrument panel. They calibrate by entering credentials (the connection form reads as a calibration panel). On connect, the workspace resolves: the sidebar becomes a frequency band display showing connections and their bucket channels. Selecting a bucket tunes the main readout — a precise data table styled as a spectrogram, each object a signal trace with frequency (key), amplitude (size), and timestamp (last modified). Actions are deliberate: upload, download, delete, presign — each a measured control on the signal generator toolbar. The entire experience feels like operating precision scientific equipment.

**FIRST VIEWPORT:** A compact header strip at top — the product name in small caps with a drawn bucket icon, the active connection shown as a "tuned frequency" in amber. Below: a two-panel workspace. Left panel (240px, surface-tinted): connection list with calibration-launch button, each connection as a frequency band with bucket count. Right panel (flex fill): the connection form (first visit) or the object explorer (connected). The object explorer shows a precise toolbar with breadcrumb path in monospace and action buttons as instrument controls, then a ruled data table with header row in caps and data rows in monospace for keys/sizes, proportional for dates. Empty state reads as "No signal detected" — a genuine instrument reading, not a placeholder.

**FORM:** Signal Analysis (PICK — the IMPECCABLE'S PICK card), seed `f1e22558`. Grounded candidate #2 in my ordered list — the deep space / radio astronomy control room direction, chosen over the assigned direction for stronger Operate fit and alignment with the user's dark-matter world preference and stated aversion to flashiness.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.