/**
 * EFF Panel Right — Data Management Controls and Asset Counts
 *
 * Manages:
 *  - Active Project section (name input, Open / Switch Project)
 *  - Save & Backups section (Save Project, Save Changes)
 *  - Elementor Sync section (pull ↓ Variables, commit ↑ Variables)
 *  - Elementor V3 Import section (↓ V3 Colors)
 *  - Export / Import section (bound via eff-panel-top.js by element ID)
 *  - Live asset count display (variables, classes, components)
 *
 * @package ElementorFrameworkForge
 */

/* global EFFData */
(function () {
	'use strict';

	window.EFF = window.EFF || {};

	EFF.PanelRight = {

		/** @type {HTMLInputElement|null} */
		_filenameInput: null,
		/** @type {HTMLElement|null} */
		_loadBtn: null,
		/** @type {HTMLElement|null} */
		_saveBtn: null,
		/** @type {HTMLElement|null} */
		_saveChangesBtn: null,
		/** @type {HTMLElement|null} */
		_syncVariablesBtn: null,
		/** @type {HTMLElement|null} */
		_commitVariablesBtn: null,
		/** @type {HTMLElement|null} */
		_v3ColorsBtn: null,
		/** @type {string|null} Current project slug shown in Level 2 picker */
		_pickerCurrentSlug: null,

		/**
		 * Initialize the right panel.
		 */
		init: function () {
			this._filenameInput       = document.getElementById('eff-filename');
			this._loadBtn             = document.getElementById('eff-btn-load');
			this._saveBtn             = document.getElementById('eff-btn-save');
			this._saveChangesBtn      = document.getElementById('eff-btn-save-changes');
			this._syncVariablesBtn    = document.getElementById('eff-btn-sync-variables');
			this._commitVariablesBtn  = document.getElementById('eff-btn-commit-variables');
			this._v3ColorsBtn         = document.getElementById('eff-btn-v3-colors');

			this._bindLoadBtn();
			this._bindSaveBtn();
			this._bindSaveChangesBtn();
			this._bindSyncVariablesBtn();
			this._bindCommitVariablesBtn();
			this._bindV3ColorsBtn();
			this._bindFilenameInput();
		},

		// ------------------------------------------------------------------
		// FILENAME INPUT — keep EFF.state.projectName in sync
		// ------------------------------------------------------------------

		_bindFilenameInput: function () {
			if (!this._filenameInput) { return; }
			var self = this;
			this._filenameInput.addEventListener('input', function () {
				EFF.state.projectName = self._filenameInput.value.trim();
			});
			this._filenameInput.addEventListener('focus', function () { this.select(); });
		},

		// ------------------------------------------------------------------
		// LOAD FILE
		// ------------------------------------------------------------------

		_bindLoadBtn: function () {
			if (!this._loadBtn) { return; }
			var self = this;

			this._loadBtn.addEventListener('click', function () {
				self._openProjectPicker();
			});
		},

		/**
		 * Execute an AJAX load for the given file path.
		 * path can be a relative backup path (slug/slug_date.eff.json) or legacy flat name.
		 *
		 * @param {string} path  File path passed directly to the server.
		 */
		_loadFile: function (path) {
			var self = this;

			EFF.App.ajax('eff_load_file', { filename: path })
				.then(function (res) {
					if (res.success) {
						EFF.state.variables  = res.data.data.variables  || [];
						EFF.state.classes    = res.data.data.classes    || [];
						EFF.state.components = res.data.data.components || [];
						var _oldGroups = EFF.state.config && EFF.state.config.groups;
						EFF.state.config     = res.data.data.config     || {};
						if (!EFF.state.config.groups && _oldGroups) { EFF.state.config.groups = _oldGroups; }
					// Preserve Phase 2 category arrays from globalConfig when the file's
					// config doesn't have them (e.g. older files saved before categories existed).
					if (EFF.state.globalConfig) {
						var _gc = EFF.state.globalConfig;
						if ((!EFF.state.config.categories       || !EFF.state.config.categories.length)       && _gc.categories       && _gc.categories.length)       { EFF.state.config.categories       = _gc.categories.slice(); }
						if ((!EFF.state.config.fontCategories   || !EFF.state.config.fontCategories.length)   && _gc.fontCategories   && _gc.fontCategories.length)   { EFF.state.config.fontCategories   = _gc.fontCategories.slice(); }
						if ((!EFF.state.config.numberCategories || !EFF.state.config.numberCategories.length) && _gc.numberCategories && _gc.numberCategories.length) { EFF.state.config.numberCategories = _gc.numberCategories.slice(); }
					}
						EFF.state.currentFile = res.data.filename;

						// Prefer the name stored inside the project file for round-trip accuracy.
						// Strip any stale .eff extension to prevent -eff suffix on next save.
					var displayName = (res.data.data.name || name).replace(/(?:\.eff)+(?:\.json)?$/i, '');
						EFF.state.projectName = displayName;
						if (self._filenameInput) {
							self._filenameInput.value = displayName;
						}

						EFF.App.refreshCounts();
						if (EFF.PanelLeft) { EFF.PanelLeft.refresh(); }
						EFF.App.setDirty(false);
						EFF.Modal.close();

						// Persist last loaded filename so auto-load can restore it on next open.
						EFF.App.ajax('eff_save_settings', {
							settings: JSON.stringify({ last_file: res.data.filename }),
						});

						if (res.data.created) {
							self._showToast('Project created');
						}

						// Scan widget usage for loaded variables (async, non-blocking).
						EFF.App.fetchUsageCounts();
					} else {
						EFF.Modal.open({ title: 'Load error', body: '<p>' + (res.data.message || 'Unknown error.') + '</p>' });
					}
				})
				.catch(function () {
					EFF.Modal.open({ title: 'Load error', body: '<p>Network error while loading.</p>' });
				});
		},

		/**
		 * Silently load a file on startup (no dirty flag, no modal on failure).
		 * Used for auto-loading the last opened file.
		 *
		 * @param {string} filename  Stored .eff.json filename (not a project name).
		 */
		_autoLoadFile: function (filename) {
			var self = this;

			EFF.App.ajax('eff_load_file', { filename: filename })
				.then(function (res) {
					if (res.success) {
						EFF.state.variables  = res.data.data.variables  || [];
						EFF.state.classes    = res.data.data.classes    || [];
						EFF.state.components = res.data.data.components || [];
						var _oldGroupsAL = EFF.state.config && EFF.state.config.groups;
						EFF.state.config     = res.data.data.config     || {};
						if (!EFF.state.config.groups && _oldGroupsAL) { EFF.state.config.groups = _oldGroupsAL; }
					// Preserve Phase 2 category arrays from globalConfig when the file's
					// config doesn't have them (e.g. older files saved before categories existed).
					if (EFF.state.globalConfig) {
						var _gcAL = EFF.state.globalConfig;
						if ((!EFF.state.config.categories       || !EFF.state.config.categories.length)       && _gcAL.categories       && _gcAL.categories.length)       { EFF.state.config.categories       = _gcAL.categories.slice(); }
						if ((!EFF.state.config.fontCategories   || !EFF.state.config.fontCategories.length)   && _gcAL.fontCategories   && _gcAL.fontCategories.length)   { EFF.state.config.fontCategories   = _gcAL.fontCategories.slice(); }
						if ((!EFF.state.config.numberCategories || !EFF.state.config.numberCategories.length) && _gcAL.numberCategories && _gcAL.numberCategories.length) { EFF.state.config.numberCategories = _gcAL.numberCategories.slice(); }
					}
						EFF.state.currentFile = res.data.filename;

						var displayName = (res.data.data.name
							|| (res.data.filename || '').replace(/(?:\.eff)+(?:\.json)?$/i, ''))
							.replace(/(?:\.eff)+(?:\.json)?$/i, '');
						EFF.state.projectName = displayName;
						if (self._filenameInput) {
							self._filenameInput.value = displayName;
						}

						EFF.App.refreshCounts();
						if (EFF.PanelLeft) { EFF.PanelLeft.refresh(); }
						EFF.App.fetchUsageCounts();
					}
					// Silent on failure — user will see empty state as expected.
				})
				.catch(function () {
					// Silent on network error at startup.
				});
		},

		// ------------------------------------------------------------------
		// SAVE FILE
		// ------------------------------------------------------------------

		_bindSaveBtn: function () {
			if (!this._saveBtn) { return; }
			var self = this;

			this._saveBtn.addEventListener('click', function () {
				var name = self._filenameInput ? self._filenameInput.value.trim() : '';
				if (!name) {
					EFF.Modal.open({ title: 'Name required', body: '<p>Please enter a project name before saving.</p>' });
					if (self._filenameInput) { self._filenameInput.focus(); }
					return;
				}
				self._saveFile(name);
			});
		},

		/**
		 * Execute an AJAX save for the given project name.
		 * Derives the filename from the human name via _getFilename().
		 *
		 * @param {string} name  Human-readable project name.
		 */
		_saveFile: function (name) {
			var self      = this;
			var cleanName = (name || '').trim().replace(/(?:\.eff)+(?:\.json)?$/i, '');
			var data = {
				version:    '1.0',
				name:       cleanName,
				config:     EFF.state.config,
				variables:  EFF.state.variables,
				classes:    EFF.state.classes,
				components: EFF.state.components,
			};

			EFF.App.ajax('eff_save_file', {
				project_name: cleanName,
				data:         JSON.stringify(data),
			})
				.then(function (res) {
					if (res.success) {
						EFF.state.currentFile = res.data.filename;
						EFF.state.projectName = cleanName;
						if (self._filenameInput) {
							self._filenameInput.value = cleanName;
						}
						EFF.App.setDirty(false);
						// Keep last_file in sync so auto-load restores the correct project.
						EFF.App.ajax('eff_save_settings', {
							settings: JSON.stringify({ last_file: res.data.filename }),
						});
					} else {
						EFF.Modal.open({ title: 'Save error', body: '<p>' + (res.data.message || 'Unknown error.') + '</p>' });
					}
				})
				.catch(function () {
					EFF.Modal.open({ title: 'Save error', body: '<p>Network error while saving.</p>' });
				});
		},

		// ------------------------------------------------------------------
		// SAVE CHANGES BUTTON
		// ------------------------------------------------------------------

		_bindSaveChangesBtn: function () {
			if (!this._saveChangesBtn) { return; }
			var self = this;

			this._saveChangesBtn.addEventListener('click', function () {
				if (EFF.state.hasUnsavedChanges) {
					var name = (self._filenameInput ? self._filenameInput.value.trim() : '')
						|| EFF.state.projectName || '';
					if (name) {
						self._saveFile(name);
					}
				}
			});
		},

		/**
		 * Update the Save Changes button state.
		 * Disabled when no unsaved changes exist.
		 * Shows "Saving…" and stays disabled while per-variable saves are in-flight
		 * (pendingSaveCount > 0) to prevent a full file save over stale state.
		 */
		updateSaveChangesBtn: function () {
			if (!this._saveChangesBtn) { return; }

			var isPending = EFF.state.pendingSaveCount > 0;
			var isDirty   = EFF.state.hasUnsavedChanges;

			if (isPending) {
				this._saveChangesBtn.disabled         = true;
				this._saveChangesBtn.setAttribute('aria-disabled', 'true');
				this._saveChangesBtn.textContent      = 'Saving\u2026';
			} else {
				this._saveChangesBtn.disabled         = !isDirty;
				this._saveChangesBtn.setAttribute('aria-disabled', String(!isDirty));
				this._saveChangesBtn.textContent      = 'Save Changes';
			}
		},

		// ------------------------------------------------------------------
		// PROJECT PICKER MODAL — Two-level navigator
		// ------------------------------------------------------------------

		/**
		 * Open the project picker: fetch project list and show Level 1.
		 */
		_openProjectPicker: function () {
			var self = this;
			self._pickerCurrentSlug = null;

			EFF.App.ajax('eff_list_projects', {})
				.then(function (res) {
					if (res.success) {
						EFF.Modal.open({ title: 'Load Project', body: '', footer: '' });
						self._showProjectList(res.data.projects || []);
					} else {
						EFF.Modal.open({ title: 'Error', body: '<p>' + (res.data.message || 'Could not load projects.') + '</p>' });
					}
				})
				.catch(function () {
					EFF.Modal.open({ title: 'Error', body: '<p>Network error loading project list.</p>' });
				});
		},

		/**
		 * Render Level 1 — project list.
		 * @param {Array} projects  [{slug, name, backup_count, latest_modified}]
		 */
		_showProjectList: function (projects) {
			var self     = this;
			var modalBody = document.getElementById('eff-modal-body');
			if (!modalBody) { return; }

			modalBody.innerHTML = self._buildProjectListBody(projects);

			modalBody.addEventListener('click', function pickerL1(e) {
				// Open project → Level 2
				var openBtn = e.target.closest('.eff-picker-open-project');
				if (openBtn) {
					var slug = openBtn.getAttribute('data-slug');
					self._pickerCurrentSlug = slug;
					EFF.App.ajax('eff_list_backups', { project_slug: slug })
						.then(function (res) {
							if (res.success) {
								self._showBackupList(slug, res.data.backups || []);
							}
						});
					modalBody.removeEventListener('click', pickerL1);
					return;
				}

				// Create button — clear state, start fresh project
				if (e.target.id === 'eff-picker-create-btn') {
					var nameInput = document.getElementById('eff-picker-name-input');
					var newName   = nameInput ? nameInput.value.trim() : '';
					if (!newName) {
						if (nameInput) { nameInput.focus(); }
						return;
					}
					EFF.Modal.close();
					modalBody.removeEventListener('click', pickerL1);

					// Clear all project data for a genuinely blank new project.
					EFF.state.variables   = [];
					EFF.state.classes     = [];
					EFF.state.components  = [];
					EFF.state.config      = {};
					EFF.state.currentFile = null;
					EFF.state.projectName = newName;
					EFF.App.setDirty(false);
					EFF.App.refreshCounts();
					if (EFF.PanelLeft) { EFF.PanelLeft.refresh(); }
					if (self._filenameInput) { self._filenameInput.value = newName; }

					// Save the initial (empty) backup to create the project on disk.
					self._saveFile(newName);
				}
			});
		},

		/**
		 * Render Level 2 — backup list for a project.
		 * @param {string} slug
		 * @param {Array}  backups  [{filename, name, modified}]
		 */
		_showBackupList: function (slug, backups) {
			var self     = this;
			var modalBody = document.getElementById('eff-modal-body');
			if (!modalBody) { return; }

			modalBody.innerHTML = self._buildBackupListBody(slug, backups);

			modalBody.addEventListener('click', function pickerL2(e) {
				// Back button → Level 1
				if (e.target.closest('.eff-picker-back')) {
					modalBody.removeEventListener('click', pickerL2);
					EFF.App.ajax('eff_list_projects', {})
						.then(function (res) {
							if (res.success) {
								self._showProjectList(res.data.projects || []);
							}
						});
					return;
				}

				// Load backup
				var loadBtn = e.target.closest('.eff-picker-load');
				if (loadBtn) {
					var file    = loadBtn.getAttribute('data-file');
					var rawName = (loadBtn.getAttribute('data-name') || '').replace(/(?:\.eff)+(?:\.json)?$/i, '');
					EFF.Modal.close();
					if (self._filenameInput) { self._filenameInput.value = rawName; }
					self._loadFile(file);
					modalBody.removeEventListener('click', pickerL2);
					return;
				}

				// Delete backup
				var delBtn = e.target.closest('.eff-picker-delete');
				if (delBtn) {
					var filename = delBtn.getAttribute('data-filename');
					EFF.App.ajax('eff_delete_project', { filename: filename })
						.then(function (res) {
							if (res.success) {
								// Refresh Level 2; if empty, go back to Level 1.
								modalBody.removeEventListener('click', pickerL2);
								EFF.App.ajax('eff_list_backups', { project_slug: self._pickerCurrentSlug })
									.then(function (r) {
										if (r.success && r.data.backups && r.data.backups.length > 0) {
											self._showBackupList(self._pickerCurrentSlug, r.data.backups);
										} else {
											EFF.App.ajax('eff_list_projects', {})
												.then(function (pr) {
													if (pr.success) { self._showProjectList(pr.data.projects || []); }
												});
										}
									});
							} else {
								EFF.Modal.open({ title: 'Delete error', body: '<p>' + (res.data.message || 'Could not delete.') + '</p>' });
							}
						})
						.catch(function () {});
					return;
				}
			});
		},

		/**
		 * Build Level 1 HTML — project rows + create section.
		 * @param {Array} projects
		 * @returns {string}
		 */
		_buildProjectListBody: function (projects) {
			var self = this;
			var html = '<div class="eff-picker-list">';

			if (projects.length > 0) {
				for (var i = 0; i < projects.length; i++) {
					var p = projects[i];
					html += '<div class="eff-picker-row">'
						+ '<span class="eff-picker-row__name">' + self._escHtml(p.name) + '</span>'
						+ '<span class="eff-picker-row__date">' + self._escHtml(p.backup_count + ' save' + (p.backup_count !== 1 ? 's' : '') + ' \u00b7 ' + p.latest_modified) + '</span>'
						+ '<button class="eff-btn eff-btn--xs eff-picker-open-project"'
						+ ' data-slug="' + self._escAttr(p.slug) + '">Open</button>'
						+ '</div>';
				}
			} else {
				html += '<p class="eff-text-muted" style="padding:8px 0">No saved projects found.</p>';
			}

			html += '</div>'; // .eff-picker-list

			html += '<div class="eff-picker-create">'
				+ '<input type="text" class="eff-field-input" id="eff-picker-name-input"'
				+ ' placeholder="New project name\u2026" autocomplete="off" />'
				+ '<button class="eff-btn" id="eff-picker-create-btn">Create</button>'
				+ '</div>';

			var _storageNote = (typeof EFFData !== 'undefined' && EFFData.uploadUrl)
				? EFFData.uploadUrl.replace(/^https?:\/\/[^/]+/, '')
				: 'wp-content/uploads/eff/';
			html += '<p style="font-size:11px;color:var(--eff-clr-muted);margin-top:12px;padding-top:8px;border-top:1px solid var(--eff-clr-border)">'
				+ 'Files stored in: <code style="user-select:all">' + _storageNote + '</code></p>';

			return html;
		},

		/**
		 * Build Level 2 HTML — back bar + backup rows.
		 * @param {string} slug
		 * @param {Array}  backups  [{filename, name, modified}]
		 * @returns {string}
		 */
		_buildBackupListBody: function (slug, backups) {
			var self = this;
			var trashSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">'
				+ '<path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>'
				+ '<path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>'
				+ '</svg>';

			var html = '<div class="eff-picker-back-bar">'
				+ '<button class="eff-icon-btn eff-picker-back" aria-label="Back to projects">\u2190</button>'
				+ '<span>' + self._escHtml(slug) + '</span>'
				+ '</div>'
				+ '<div class="eff-picker-list">';

			if (backups.length > 0) {
				for (var i = 0; i < backups.length; i++) {
					var b = backups[i];
					html += '<div class="eff-picker-row">'
						+ '<span class="eff-picker-row__name">' + self._escHtml(b.modified) + '</span>'
						+ '<button class="eff-btn eff-btn--xs eff-picker-load"'
						+ ' data-name="' + self._escAttr(b.name) + '"'
						+ ' data-file="' + self._escAttr(b.filename) + '">Load</button>'
						+ '<button class="eff-icon-btn eff-picker-delete"'
						+ ' data-filename="' + self._escAttr(b.filename) + '"'
						+ ' aria-label="Delete backup">'
						+ trashSvg
						+ '</button>'
						+ '</div>';
				}
			} else {
				html += '<p class="eff-text-muted" style="padding:8px 0">No backups found.</p>';
			}

			html += '</div>'; // .eff-picker-list
			return html;
		},

		// ------------------------------------------------------------------
		// ELEMENTOR SYNC — pull variables from Elementor
		// ------------------------------------------------------------------

		/**
		 * Bind the ↓ Variables (sync from Elementor) button.
		 * Shows a sync-options dialog before executing.
		 */
		_bindSyncVariablesBtn: function () {
			if (!this._syncVariablesBtn) { return; }
			var self = this;

			this._syncVariablesBtn.addEventListener('click', function () {
				self._openSyncOptionsDialog();
			});
		},

		/**
		 * Open the Sync Options dialog (Sync by name / Clear and replace).
		 */
		_openSyncOptionsDialog: function () {
			EFF.Modal.open({
				title: 'Sync from Elementor',
				body:  '<p style="margin-bottom:12px">Choose how EFF should handle existing variables when importing from the Elementor kit.</p>'
					+ '<div style="display:flex;flex-direction:column;gap:10px">'
					+ '<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer">'
					+ '<input type="radio" name="eff-sync-mode" value="name" checked style="margin-top:3px;flex-shrink:0" />'
					+ '<span><strong>Sync by name</strong><br>'
					+ '<span style="font-size:12px;color:var(--eff-clr-muted)">Add new variables; keep existing EFF values unchanged. Safe for incremental updates.</span></span>'
					+ '</label>'
					+ '<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer">'
					+ '<input type="radio" name="eff-sync-mode" value="clear" style="margin-top:3px;flex-shrink:0" />'
					+ '<span><strong>Clear and replace</strong><br>'
					+ '<span style="font-size:12px;color:var(--eff-clr-muted)">Remove all existing variables and import fresh from Elementor. Discards EFF edits.</span></span>'
					+ '</label>'
					+ '</div>',
				footer: '<div style="display:flex;justify-content:flex-end;gap:8px">'
					+ '<button class="eff-btn eff-btn--secondary" id="eff-sync-cancel">Cancel</button>'
					+ '<button class="eff-btn" id="eff-sync-confirm">Sync</button>'
					+ '</div>',
			});

			document.addEventListener('click', function syncHandler(e) {
				if (e.target.id === 'eff-sync-cancel') {
					EFF.Modal.close();
					document.removeEventListener('click', syncHandler);
				} else if (e.target.id === 'eff-sync-confirm') {
					var modeInput = document.querySelector('input[name="eff-sync-mode"]:checked');
					var clearMode = modeInput && modeInput.value === 'clear';
					EFF.Modal.close();
					document.removeEventListener('click', syncHandler);
					if (clearMode) {
						EFF.state.variables = [];
					}
					if (EFF.PanelTop && EFF.PanelTop._syncFromElementor) {
						EFF.PanelTop._syncFromElementor({});
					}
				}
			});
		},

		// ------------------------------------------------------------------
		// ELEMENTOR SYNC — commit variables to Elementor
		// ------------------------------------------------------------------

		/**
		 * Bind the ↑ Variables (commit to Elementor) button.
		 */
		_bindCommitVariablesBtn: function () {
			if (!this._commitVariablesBtn) { return; }
			var self = this;

			this._commitVariablesBtn.addEventListener('click', function () {
				self._openCommitSummaryDialog();
			});
		},

		/**
		 * Build a summary of pending variable changes and open a confirmation dialog.
		 */
		_openCommitSummaryDialog: function () {
			var self     = this;
			var modified = 0;
			var added    = 0;
			var deleted  = 0;

			for (var i = 0; i < EFF.state.variables.length; i++) {
				var s = EFF.state.variables[i].status;
				if (s === 'modified') { modified++; }
				else if (s === 'new') { added++; }
				else if (s === 'deleted') { deleted++; }
			}

			var total = modified + added + deleted;

			if (total === 0) {
				EFF.Modal.open({
					title: 'Nothing to commit',
					body:  '<p>All variables are already in sync with Elementor. No changes to commit.</p>',
				});
				return;
			}

			var summaryLines = [];
			if (modified > 0) { summaryLines.push(modified + ' modified'); }
			if (added > 0)    { summaryLines.push(added    + ' new'); }
			if (deleted > 0)  { summaryLines.push(deleted  + ' deleted'); }

			EFF.Modal.open({
				title: 'Commit to Elementor',
				body:  '<p style="margin-bottom:8px">The following changes will be written to the Elementor kit CSS file:</p>'
					+ '<ul style="margin:0 0 12px 16px;list-style:disc">'
					+ summaryLines.map(function (l) { return '<li>' + l + '</li>'; }).join('')
					+ '</ul>'
					+ '<p style="font-size:12px;color:var(--eff-clr-muted)"><strong>This modifies Elementor\'s files.</strong> Save a backup first if you haven\'t already.</p>',
				footer: '<div style="display:flex;justify-content:flex-end;gap:8px">'
					+ '<button class="eff-btn eff-btn--secondary" id="eff-commit-cancel">Cancel</button>'
					+ '<button class="eff-btn" id="eff-commit-confirm">Commit</button>'
					+ '</div>',
			});

			document.addEventListener('click', function commitHandler(e) {
				if (e.target.id === 'eff-commit-cancel') {
					EFF.Modal.close();
					document.removeEventListener('click', commitHandler);
				} else if (e.target.id === 'eff-commit-confirm') {
					EFF.Modal.close();
					document.removeEventListener('click', commitHandler);
					self._executeCommit();
				}
			});
		},

		/**
		 * Execute the commit AJAX call.
		 *
		 * Sends all current variables to eff_commit_to_elementor, then updates
		 * variable statuses to 'synced' and clears the pending commit flag.
		 */
		_executeCommit: function () {
			if (!EFF.state.currentFile) {
				EFF.Modal.open({ title: 'No file loaded', body: '<p>Please load a file before committing.</p>' }); return;
			}

			var variables = EFF.state.variables.map(function (v) {
				return { name: v.name, value: v.value };
			});

			EFF.App.ajax('eff_commit_to_elementor', {
				filename:  EFF.state.currentFile,
				variables: JSON.stringify(variables),
			}).then(function (res) {
				if (res.success) {
					var committed = res.data.committed || [];
					var skipped   = res.data.skipped || [];

					// Update variable statuses to 'synced' for committed vars.
					for (var i = 0; i < EFF.state.variables.length; i++) {
						if (committed.indexOf(EFF.state.variables[i].name) !== -1) {
							EFF.state.variables[i].status = 'synced';
						}
					}

					EFF.App.setPendingCommit(false);

					var msg = committed.length + ' variable(s) committed.';
					if (skipped.length > 0) {
						msg += ' ' + skipped.length + ' variable(s) not found in Elementor kit (check names).';
					}
					EFF.Modal.open({ title: 'Commit complete', body: '<p>' + msg + '</p>' });

					// Re-render current view to show updated status dots.
					if (EFF.Colors && EFF.state.currentSelection && EFF.state.currentSelection.subgroup === 'Colors') {
						EFF.Colors.loadColors(EFF.state.currentSelection);
					}
				} else {
					EFF.Modal.open({ title: 'Commit error', body: '<p>' + ((res.data && res.data.message) || 'Unknown error.') + '</p>' });
				}
			}).catch(function () {
				EFF.Modal.open({ title: 'Commit error', body: '<p>Network error during commit.</p>' });
			});
		},

		/**
		 * Toggle the accent highlight on the ↑ Variables (commit) button.
		 *
		 * Called from EFF.App.setPendingCommit(). Adds .eff-btn--accent when
		 * there are pending commits so the button pulses; removes it when clear.
		 */
		updateCommitBtn: function () {
			if (!this._commitVariablesBtn) { return; }

			var hasPending = EFF.state.hasPendingElementorCommit;
			if (hasPending) {
				this._commitVariablesBtn.classList.add('eff-btn--accent');
			} else {
				this._commitVariablesBtn.classList.remove('eff-btn--accent');
			}
		},

		// ------------------------------------------------------------------
		// ELEMENTOR V3 IMPORT — import V3 Global Colors
		// ------------------------------------------------------------------

		/**
		 * Bind the ↓ V3 Colors button.
		 */
		_bindV3ColorsBtn: function () {
			if (!this._v3ColorsBtn) { return; }
			var self = this;

			this._v3ColorsBtn.addEventListener('click', function () {
				self._openV3ImportDialog();
			});
		},

		/**
		 * Open the V3 Import confirmation dialog, then execute.
		 */
		_openV3ImportDialog: function () {
			var self = this;

			EFF.Modal.open({
				title: 'Import V3 Global Colors',
				body:  '<p style="margin-bottom:8px">This will read the V3 Global Colors stored in your Elementor kit post meta and import them as EFF color variables.</p>'
					+ '<p style="font-size:12px;color:var(--eff-clr-muted)">Existing EFF variables with the same name will not be overwritten. New colors will be added to <em>Uncategorized</em>.</p>',
				footer: '<div style="display:flex;justify-content:flex-end;gap:8px">'
					+ '<button class="eff-btn eff-btn--secondary" id="eff-v3-cancel">Cancel</button>'
					+ '<button class="eff-btn" id="eff-v3-confirm">Import</button>'
					+ '</div>',
			});

			document.addEventListener('click', function v3Handler(e) {
				if (e.target.id === 'eff-v3-cancel') {
					EFF.Modal.close();
					document.removeEventListener('click', v3Handler);
				} else if (e.target.id === 'eff-v3-confirm') {
					EFF.Modal.close();
					document.removeEventListener('click', v3Handler);
					self._executeV3Import();
				}
			});
		},

		/**
		 * Execute the V3 colors import AJAX call.
		 */
		_executeV3Import: function () {
			EFF.App.ajax('eff_sync_v3_global_colors', {})
				.then(function (res) {
					if (res.success) {
						var imported = res.data.imported || [];

						imported.forEach(function (v) {
							var existing = EFF.state.variables.filter(function (ev) { return ev.name === v.name; });
							if (existing.length === 0) {
								EFF.state.variables.push({
									id:          '',
									name:        v.name,
									value:       v.value,
									source:      'elementor-v3',
									type:        'color',
									group:       'Variables',
									subgroup:    'Colors',
									category:    'Uncategorized',
									category_id: '',
									modified:    false,
									status:      'new',
									created_at:  new Date().toISOString(),
									updated_at:  new Date().toISOString(),
								});
							}
						});

						EFF.App.refreshCounts();
						if (EFF.Colors && EFF.Colors._ensureUncategorized) { EFF.Colors._ensureUncategorized(); }
						if (EFF.PanelLeft) { EFF.PanelLeft.refresh(); }
						if (imported.length > 0) { EFF.App.setDirty(true); }

						var msg = imported.length > 0
							? imported.length + ' V3 color' + (imported.length !== 1 ? 's' : '') + ' imported.'
							: 'No V3 Global Colors found in the active Elementor kit.';
						EFF.Modal.open({ title: 'V3 Import complete', body: '<p>' + msg + '</p>' });
					} else {
						EFF.Modal.open({ title: 'V3 Import error', body: '<p>' + ((res.data && res.data.message) || 'Unknown error.') + '</p>' });
					}
				})
				.catch(function () {
					EFF.Modal.open({ title: 'V3 Import error', body: '<p>Network error during V3 import.</p>' });
				});
		},

		// ------------------------------------------------------------------
		// COUNTS
		// ------------------------------------------------------------------

		/**
		 * Update the displayed asset counts.
		 *
		 * @param {{ variables: number, classes: number, components: number }} counts
		 */
		updateCounts: function (counts) {
			this._setCount('eff-count-variables',  counts.variables  || 0);
			this._setCount('eff-count-classes',    counts.classes    || 0);
			this._setCount('eff-count-components', counts.components || 0);
		},

		/**
		 * @param {string} id    Element ID.
		 * @param {number} value Count value.
		 * @private
		 */
		_setCount: function (id, value) {
			var el = document.getElementById(id);
			if (el) {
				el.textContent = String(value);
			}
		},

		// ------------------------------------------------------------------
		// HELPERS
		// ------------------------------------------------------------------

		/**
		 * Derive a .eff.json filename from a human-readable project name.
		 * Slugifies the name: lower-case, hyphens, strips leading/trailing hyphens.
		 *
		 * @param {string} name  Human-readable project name.
		 * @returns {string}     e.g. "my-e-commerce-site.eff.json"
		 */
		_getFilename: function (name) {
			return (name || '').trim()
				.replace(/\.eff\.json$/i, '')   // strip full extension if already present
				.replace(/\.eff$/i, '')          // strip partial extension
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
				+ '.eff.json';
		},

		/**
		 * Escape a string for safe insertion into HTML text content.
		 * @param {string} str
		 * @returns {string}
		 */
		_escHtml: function (str) {
			return String(str || '')
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
		},

		/**
		 * Escape a string for safe use in an HTML attribute value (double-quoted).
		 * @param {string} str
		 * @returns {string}
		 */
		_escAttr: function (str) {
			return String(str || '')
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;');
		},

		/**
		 * Show a brief toast notification.
		 * Auto-dismisses after 2 seconds.
		 *
		 * @param {string} message
		 */
		_showToast: function (message) {
			var toast = document.createElement('div');
			toast.className   = 'eff-toast';
			toast.textContent = message;
			document.body.appendChild(toast);

			// Trigger the transition in the next frame.
			requestAnimationFrame(function () {
				toast.classList.add('eff-toast--visible');
			});

			setTimeout(function () {
				toast.classList.remove('eff-toast--visible');
				setTimeout(function () { toast.remove(); }, 300);
			}, 2000);
		},
	};
}());
