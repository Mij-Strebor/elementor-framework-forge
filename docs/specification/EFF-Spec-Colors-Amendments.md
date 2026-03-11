# EFF Spec Colors — Amendments

**Date:** 2026-03-09
**Amends:** EFF-Spec-Colors.docx
**Author:** Jim Roberts / Jim R Forge

This file records amendments to the Colors specification that supersede the base `.docx` file.
See `EFF-Spec-Changelog.docx` for the master change log.

---

## Amendment 1 — Tint/Shade/Transparency Naming Convention (2026-03-09)

### Previous naming (superseded)
| Type | Pattern | Example |
|---|---|---|
| Tints | `--name-plus-NNN` | `--primary-plus-300` |
| Shades | `--name-minus-NNN` | `--primary-minus-300` |
| Transparencies | `--name-NNN` | `--primary-050` |

Steps were fixed: 0, 3-step (300/600/900), or 9-step (100–900).

### New naming (current — §15.7 replacement)

#### Tints (lighter — upshift toward white)
- **User display:** `{ColorName}-{step×10}` — e.g., `Primary-10`, `Primary-20`, `Primary-30`
- **CSS custom property:** `--{varname}-{step×10}` — e.g., `--eff-color-brand-primary-10`
- **Steps:** User-configurable 0–10. Each step interpolates lightness equally toward 100%.
  - Step *i* of *N*: `L_i = L + (100 − L) × i/N` (clamped to 98% max)
  - For N=3: step 1 = 1/3 of way to white, step 2 = 2/3, step 3 = full endpoint

#### Shades (darker — downshift toward black)
- **User display:** `{ColorName}+{step×10}` — e.g., `Primary+10`, `Primary+20`, `Primary+30`
- **CSS custom property:** `--{varname}-plus-{step×10}` — e.g., `--eff-color-brand-primary-plus-10`
  (The `+` is encoded as `-plus-` because `+` is not valid in CSS custom property names)
- **Steps:** User-configurable 0–10. Each step interpolates lightness equally toward 0%.
  - Step *i* of *N*: `L_i = L × (1 − i/N)` (clamped to 2% min)

#### Transparencies (alpha channel steps — fixed 9 levels)
- **User display:** `{ColorName}{step×10}` — e.g., `Primary10`, `Primary20`, … `Primary90`
- **CSS custom property:** `--{varname}{step×10}` — e.g., `--eff-color-brand-primary10`
  (No separator between variable name and number)
- **Steps:** Always 9 fixed steps when enabled. Alpha = step/10 (0.1 to 0.9).
  - `Primary10` → alpha 0.1 (10% opacity)
  - `Primary90` → alpha 0.9 (90% opacity)
- **Format:** Always stored as HEXA (`#rrggbbaa`)
- **Toggle:** On/Off only (not a step count). When On: generates all 9 levels.

### UI Controls (expand panel — supersedes previous 3-zone layout)

The expand panel below each color variable row has three equal zones:

| Zone | Control | Behavior |
|---|---|---|
| Tints | `<input type="number" min="0" max="10">` | Live preview bars generated on input; AJAX save debounced 600ms |
| Shades | `<input type="number" min="0" max="10">` | Same as tints |
| Transparencies | On/Off toggle (`<input type="checkbox">`) | Live preview of all 9 steps when On; AJAX save on toggle |

**Removed from expand panel:** Color Picker (Zone 3), Generate button.

### Preview Bars

Each tint/shade/transparency step is displayed as a full-width colored bar with:
- Swatch bar (full available width, 20px height)
- Variable name label (e.g., `primary-10`)
- Percentage indicator (e.g., `+33%` for tints, `-33%` for shades, `10%α` for transparencies)

### Import / Export / Sync Considerations

The `.eff.json` file stores generated child variables with `parent_id` set to the parent variable's UUID. During sync:
- Children are identified by `parent_id !== null`
- Tint children: name matches `/-\d+$/` and does not contain `-plus-`
- Shade children: name matches `/-plus-\d+$/`
- Transparency children: name matches `/\d+$/` and does not contain `-plus-` or `-{number}$` pattern (no hyphen before number)

When exporting design system data (EFF-Spec-Sync), child variables are included in the export with their `parent_id` preserved so the relationship can be reconstructed on import.

When syncing from Elementor: child variables are not present in Elementor's compiled CSS (they exist only in the EFF data store) and will appear as `orphaned` status after a sync. This is expected — commit them to Elementor to push child variables into the Elementor kit.

---

*End of EFF-Spec-Colors-Amendments.md*
*© Jim Roberts / Jim R Forge — jimrforge.com*
