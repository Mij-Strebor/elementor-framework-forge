# Changelog

All notable changes to Elementor Framework Forge are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-03-01

Initial public release.

### Added — Core Framework

- **Plugin bootstrap** — `elementor-framework-forge.php` with WordPress plugin headers, constants (`EFF_VERSION`, `EFF_PLUGIN_DIR`, `EFF_PLUGIN_URL`, `EFF_SLUG`), and dependency guards for both Elementor and Elementor Pro. Admin notice displayed if either dependency is missing.
- **Activation hook** — Creates `/wp-content/uploads/eff/` storage directory on activation.
- **`EFF_Loader`** — Requires all includes and wires up the WordPress integration layer. Business logic kept separate from WordPress-specific bootstrap code.

### Added — CSS Parser

- **`EFF_CSS_Parser`** — Locates the Elementor kit CSS file (`post-{id}.css`) by reading the `elementor_active_kit` option first, falling back to scanning `uploads/elementor/css/`. Identifies the **last `:root {}` block** in the stylesheet as the Elementor v4 atomic variable block — distinguished from the legacy `--e-global-*` block by position and a 17-entry system prefix exclusion list (`--e-global-`, `--e-a-`, `--arts-`, `--container-`, etc.).
- **`lamp()` normalization** — `preg_replace('/\blamp\s*\(/', 'clamp(', $value)` corrects the known Elementor v4 editor typo on import.
- **Read-only guarantee** — Parser never writes to or modifies Elementor's CSS output files.

### Added — Data Layer

- **`EFF_Data_Store`** — Platform-portable data layer with zero WordPress dependencies in core logic. CRUD for variables, classes, and components. `load_from_file()` / `save_to_file()` handle `.eff.json` project files. `import_parsed_variables()` merges new variables from Elementor without overwriting existing ones. WordPress adapter methods (`get_wp_storage_dir()`, `sanitize_filename()`) isolated at bottom of class.
- **`EFF_Settings`** — Static class managing plugin preferences via WordPress options API. Keys: `default_file_path`, `auto_sync`.
- **`eff-defaults.json`** — Default project config with Colors subgroups (Branding, Backgrounds, Neutral, Status) and Numbers subgroups (Spacing, Gaps, Grids, Radius).

### Added — AJAX Endpoints

All endpoints require `manage_options` capability and pass `check_ajax_referer('eff_admin_nonce')`.

- `eff_save_file` — Writes project data to a `.eff.json` file in the uploads directory.
- `eff_load_file` — Reads and parses a `.eff.json` file; returns variables, classes, components, config.
- `eff_sync_from_elementor` — Calls `EFF_CSS_Parser` to locate and parse the kit CSS; returns v4 variable array with count and source filename.
- `eff_save_user_theme` — Persists `'light'` or `'dark'` preference to `eff_theme_preference` usermeta.
- `eff_get_config` / `eff_save_config` — Read and write project subgroup configuration to WordPress options.
- `eff_get_settings` / `eff_save_settings` — Read and write plugin preferences.

### Added — Admin Interface

- **`EFF_Admin`** — Registers top-level admin menu page (capability: `manage_options`, position: 30). Enqueues `eff-theme.css`, `eff-layout.css`, and seven JS modules in dependency order. Passes `EFFData` object to JS via `wp_localize_script` (ajaxUrl, nonce, theme, version, uploadUrl, pluginUrl).
- **Four-panel layout** (`page-eff-main.php`) — Full-height admin panel with:
  - **Top menu bar** — Preferences, Manage Project (left); Export, Import, Sync, History, Search, Help (right). All icon-only buttons with 300ms CSS tooltip system.
  - **Left navigation panel** — Collapsible to 48px. Accordion nav tree: Variables (Colors / Fonts / Numbers subgroups) → Classes → Components. Dynamically populated subgroup items from project config.
  - **Center edit space** — Banner placeholder on initial load; category view with variable list when a category is selected.
  - **Right status panel** — Storage file input, Load / Save / Save Changes buttons; asset count display (Variables / Classes / Components).
- **Mobile restriction overlay** — `.eff-mobile-block` hidden on desktop; shown full-screen at `max-width: 1023px` with `.eff-app { display: none }`.

### Added — JavaScript Modules

- **`eff-app.js`** — Global `EFF.state` object (variables, classes, components, config, usageCounts, theme, hasUnsavedChanges, currentSelection, currentFile). `EFF.App.ajax()` fetch wrapper with nonce. `EFF.App.refreshCounts()`. `EFF.App.loadConfig()`. `EFF.App.fetchUsageCounts()` — scans widget data and re-renders current category view with results. Init sequence on `DOMContentLoaded`. `beforeunload` guard for unsaved changes.
- **`eff-theme.js`** — `EFF.Theme.init()`, `set(theme)`, `toggle()`. Persists preference via `eff_save_user_theme` AJAX.
- **`eff-modal.js`** — Single-instance modal system. Focus trap (Tab/Shift+Tab cycles within modal). ESC and overlay-click close. `EFF.Modal.open({ title, body, footer, onClose })`, `EFF.Modal.close()`.
- **`eff-panel-left.js`** — Accordion group expand/collapse. Subgroup toggle. Panel collapse toggle (persisted to `localStorage`). `_loadNavItems()` populates leaf items from project config. `selectItem()` updates state and loads category in edit space.
- **`eff-panel-right.js`** — File load / save / save-changes button handlers. `updateCounts()`. `updateSaveChangesBtn()`. Triggers `EFF.App.fetchUsageCounts()` after successful file load.
- **`eff-panel-top.js`** — Tooltip system (300ms delay, CSS-positioned). All modal launchers: Preferences (theme toggle, default file path), Manage Project (subgroup editor), Search (live filter across variables), Sync (calls `eff_sync_from_elementor`, merges results, triggers usage scan), Export/Import/History/Help placeholders.
- **`eff-edit-space.js`** — `loadCategory(selection)` renders category header, column headings, and variable rows. Each row: `Variable | Value | Source | Usage`. Usage column and badge suppressed until first scan completes.

### Added — Design System

- **`eff-theme.css`** — `@font-face` for Inter 400/500/600/700. `:root` globals: type scale (`--fs-xxs` through `--fs-xxxl`), weights, line heights (`--fl-md: 1.4`, `--fl-lg: 1.2`), spacing scale (`--sp-1` through `--sp-18`), panel dimensions. Full light and dark palettes on `[data-eff-theme]` attribute. Button, input, tooltip, and modal styles.
- **`eff-layout.css`** — Four-panel flex structure. Left panel collapse transition. Variable row grid layout (`2fr 2fr 1fr auto`). Usage badge styles (`.eff-usage-badge--active` gold pill, `.eff-usage-badge--unused` muted outline). Mobile restriction block. Scrollbar styling.
- **Inter font** — Four WOFF2 files (Latin subset) loaded locally from `assets/fonts/`. No external CDN.
- **SVG icon set** — 20 icons in `assets/icons/`: gear, grid, search, export, import, sync, history, help, variables, classes, components, colors, fonts, numbers, chevron-left, chevron-right, folder-open, save, checkmark, close.

### Added — Usage Count Feature

- **`EFF_Usage_Scanner`** — `scan(array $variable_names): array`. Queries all posts with `_elementor_data` meta (capped at 500; `no_found_rows => true` for performance). For each post, runs `substr_count($data, 'var(--varname')` on the raw JSON string — no JSON decode required. Returns `['--varname' => count]`.
- **`eff_get_usage_counts` AJAX endpoint** — Accepts JSON array of variable names. Validates each against `/^--[\w-]+$/`. Returns per-variable counts and scan count.
- **Edit space integration** — Variable rows show usage badges after scan. Column header row added when variables exist. Usage column hidden until `EFF.state.usageCounts` is populated.
- **Auto-trigger** — `fetchUsageCounts()` called automatically after file load and after Sync from Elementor.

### Added — Repository

- Git repository initialized. Remote: `https://github.com/Mij-Strebor/elementor-framework-forge`
- `readme.txt` — WordPress.org plugin readme format.
- `README.md` — GitHub repository readme with banner, feature overview, architecture, installation, roadmap.
- `CHANGELOG.md` — This file.

---

## Roadmap

| Version | Planned Scope |
|---------|---------------|
| **v2** | Inline variable editing in edit space, value type pickers (color swatch, number input, font selector), drag-to-reorder within subgroups, `wp_head` variable override output |
| **v3** | Classes support; Elementor Kit Manager API integration (read/write native global colors and typography) |
| **v4** | Components registry |
| **v5** | Write-back to Elementor widget data (bulk variable rename), change history with undo, export/import |
| **Future** | Standalone Windows application · Mac application |

---

*© Jim Roberts / [Jim R Forge](https://jimrforge.com)*
