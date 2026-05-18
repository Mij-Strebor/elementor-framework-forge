# AFF Recovery Log

---

## 2026-05-18 — v1.0.0 First Stable Release

**Commit:** 8aa05c3
**Git Tag:** v1.0.0
**Zip Backup:** 260518 aff-v1.0.0-release-complete.zip
**Branch:** master

**What Works:**
- Full Variables workflow (Colors, Fonts, Numbers)
- Category management with iOS toggle delete/move
- Tints/Shades/Transparencies palette generation with Save/Cancel
- Elementor V4 sync — reads and writes kit global variables via post meta
- Project manager — versioned backups, copy, rename, delete
- Keyboard navigation in delete modals
- Tooltip auto-dismiss
- scrollIntoView on category expand
- .aff.json export/import

**Known Issues:**
- Font picker Phase 3 (aff-fonts.js) deferred — file exists but not committed

**What Changed:**
- Resolved all WordPress Plugin Check errors (is_writable, Requires PHP mismatch, hidden file, filename with spaces)
- phpcs:disable for false-positive nonce/sanitization warnings (verify_request() handles nonces)
- Added .distignore for dev markdown files
- Elementor dev constants updated to 4.0.8 / 4.0.4
- Removed beta status labels from README

**Failed Approaches:** none
