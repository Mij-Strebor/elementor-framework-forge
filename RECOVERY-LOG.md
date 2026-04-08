# AFF Recovery Log

This log records stable milestones, zip backups, and known issues for recovery purposes.
See CHANGELOG.md for full feature history.

---

## 2026-04-08 — v0.3.4-beta

**Commit:** 58820c4  
**Git Tag:** v0.3.4-beta  
**Zip Backup:** 260408 1520 aff-v0.3.4-beta-release-complete.zip  
**Branch:** master  

**What Works:**
- Full EFF → AFF rename complete — all prefixes, filenames, and AJAX action names updated
- Sync reads Elementor kit meta directly (`read_from_kit_meta()`); CSS file parsing as fallback
- Font and Number category defaults load correctly on fresh installs
- Versioned backup system with two-level project/backup picker
- Color picker (Pickr — HEX / RGB / HSL + alpha) with live palette refresh
- Tint / shade / transparency generator
- Export / Import as `.aff.json`
- Commit to Elementor (write-back to kit CSS)
- Elementor V3 Global Colors import
- Light / Dark mode per user
- Full four-panel layout: Top bar, Left nav, Center edit space, Right panel

**Known Issues:**
- Classes and Components panels are placeholders (Phase 3 / Phase 4)

**What Changed:**
- Plugin renamed from Elementor Framework Forge (EFF) to Atomic Framework Forge for Elementor (AFF)
- GitHub repo renamed to `atomic-framework-forge-for-elementor`
- Remote URL updated locally
- All dev artifacts removed (Python scripts, txt test files)
- All merged feature branches deleted

**Failed Approaches:**
- None this session
