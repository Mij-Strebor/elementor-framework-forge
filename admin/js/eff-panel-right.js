/**
 * EFF Panel Right — File Management and Asset Counts
 *
 * Manages:
 *  - Storage file name input
 *  - Load / Save file buttons
 *  - Save Changes button (inactive/active state driven by EFF.state.hasUnsavedChanges)
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
		_unsyncedIndicator: null,
		/** @type {HTMLElement|null} */
		_commitBtn: null,

		/**
		 * Initialize the right panel.
		 */
		init: function () {
			this._filenameInput     = document.getElementById('eff-filename');
			this._loadBtn           = document.getElementById('eff-btn-load');
			this._saveBtn           = document.getElementById('eff-btn-save');
			this._saveChangesBtn    = document.getElementById('eff-btn-save-changes');
			this._unsyncedIndicator = document.getElementById('eff-unsynced-indicator');
			this._commitBtn         = document.getElementById('eff-btn-commit');

			this._bindLoadBtn();
			this._bindSaveBtn();
			this._bindSaveChangesBtn();
			this._bindCommitBtn();
			this._bindFilenameInput();
		},

		// ------------------------------------------------------------------
		// FILENAME INPUT — keep EFF.state.projectName in sync
		// ------------------------------------------------------------------

		_bindFilenameInput: function () {
			if (!this._filenameInput) { return; }
			this._filenameInput.addEventListener('input', function () {
				var val = this._filenameInput.value.trim();
				// Strip .eff.json to get the human-readable project name.
				EFF.state.projectName = val.replace(/\.eff\.json$/i, '');
			}.bind(this));
		},

		// ------------------------------------------------------------------
		// LOAD FILE
		// ------------------------------------------------------------------

		_bindLoadBtn: function () {
			if (!this._loadBtn) {
				return;
			}

			this._loadBtn.addEventListener('click', function () {
				var filename = this._getFilename();
				if (!filename) {
					// Open a prompt-style modal to enter the filename
					EFF.Modal.open({
						title: 'Load file',
						body:  this._buildLoadModalBody(),
					});
					return;
				}
				this._loadFile(filename);
			}.bind(this));
		},

		/**
		 * @returns {string} HTML for the load filename modal.
		 * @private
		 */
		_buildLoadModalBody: function () {
			return '<p class="eff-text-muted" style="margin-bottom:12px">Enter the filename to load from the EFF storage directory.</p>'
				+ '<input type="text" class="eff-field-input" id="eff-modal-filename-input" '
				+ 'placeholder="e.g., my-project.eff.json" autocomplete="off" />'
				+ '<div style="margin-top:16px;display:flex;justify-content:flex-end;gap:8px">'
				+ '<button class="eff-btn" id="eff-modal-load-confirm">Load</button>'
				+ '</div>';
		},

		/**
		 * Execute an AJAX load for the given filename.
		 *
		 * @param {string} filename
		 */
		_loadFile: function (filename) {
			EFF.App.ajax('eff_load_file', { filename: filename })
				.then(function (res) {
					if (res.success) {
						// Populate state from loaded data
						EFF.state.variables  = res.data.data.variables  || [];
						EFF.state.classes    = res.data.data.classes    || [];
						EFF.state.components = res.data.data.components || [];
						EFF.state.config     = res.data.data.config     || {};
						EFF.state.currentFile = filename;

						if (this._filenameInput) {
							this._filenameInput.value = res.data.filename;
						}

						// Refresh counts and nav
						EFF.App.refreshCounts();
						if (EFF.PanelLeft) {
							EFF.PanelLeft.refresh();
						}

						EFF.App.setDirty(false);
						EFF.Modal.close();

						// Scan widget usage for loaded variables (async, non-blocking)
						EFF.App.fetchUsageCounts();
					} else {
						EFF.Modal.open({ title: 'Load error', body: '<p>' + (res.data.message || 'Unknown error.') + '</p>' });
					}
				}.bind(this))
				.catch(function () {
					EFF.Modal.open({ title: 'Load error', body: '<p>Network error while loading file.</p>' });
				});
		},

		// ------------------------------------------------------------------
		// SAVE FILE
		// ------------------------------------------------------------------

		_bindSaveBtn: function () {
			if (!this._saveBtn) {
				return;
			}

			this._saveBtn.addEventListener('click', function () {
				var filename = this._getFilename();
				if (!filename) {
					EFF.Modal.open({ title: 'Filename required', body: '<p>Please enter a filename before saving.</p>' });
					if (this._filenameInput) {
						this._filenameInput.focus();
					}
					return;
				}
				this._saveFile(filename);
			}.bind(this));
		},

		/**
		 * Execute an AJAX save for the given filename.
		 *
		 * @param {string} filename
		 */
		_saveFile: function (filename) {
			var data = {
				version:    '1.0',
				config:     EFF.state.config,
				variables:  EFF.state.variables,
				classes:    EFF.state.classes,
				components: EFF.state.components,
			};

			EFF.App.ajax('eff_save_file', {
				filename: filename,
				data:     JSON.stringify(data),
			})
				.then(function (res) {
					if (res.success) {
						EFF.state.currentFile = res.data.filename;
						if (this._filenameInput) {
							this._filenameInput.value = res.data.filename;
						}
						EFF.App.setDirty(false);
					} else {
						EFF.Modal.open({ title: 'Save error', body: '<p>' + (res.data.message || 'Unknown error.') + '</p>' });
					}
				}.bind(this))
				.catch(function () {
					EFF.Modal.open({ title: 'Save error', body: '<p>Network error while saving file.</p>' });
				});
		},

		// ------------------------------------------------------------------
		// SAVE CHANGES BUTTON
		// ------------------------------------------------------------------

		_bindSaveChangesBtn: function () {
			if (!this._saveChangesBtn) {
				return;
			}

			this._saveChangesBtn.addEventListener('click', function () {
				if (EFF.state.hasUnsavedChanges) {
					var filename = this._getFilename() || EFF.state.currentFile;
					if (filename) {
						this._saveFile(filename);
					}
				}
			}.bind(this));
		},

		/**
		 * Update the Save Changes button active/inactive state.
		 * Called whenever EFF.state.hasUnsavedChanges changes.
		 */
		updateSaveChangesBtn: function () {
			if (!this._saveChangesBtn) {
				return;
			}

			var isDirty = EFF.state.hasUnsavedChanges;

			this._saveChangesBtn.disabled         = !isDirty;
			this._saveChangesBtn.setAttribute('aria-disabled', String(!isDirty));
		},

		// ------------------------------------------------------------------
		// COMMIT TO ELEMENTOR (Phase 2)
		// ------------------------------------------------------------------

		/**
		 * Bind the Commit to Elementor button.
		 */
		_bindCommitBtn: function () {
			if (!this._commitBtn) {
				return;
			}

			this._commitBtn.addEventListener('click', function () {
				if (!EFF.state.hasPendingElementorCommit) { return; }
				this._openCommitConfirmation();
			}.bind(this));
		},

		/**
		 * Open a confirmation modal before committing.
		 *
		 * After user confirms, sends all EFF variables to the commit endpoint.
		 */
		_openCommitConfirmation: function () {
			var self = this;

			EFF.Modal.open({
				title: 'Commit to Elementor',
				body:  '<p style="margin-bottom:8px">This will write your EFF color variable values directly to the Elementor kit CSS file.</p>'
					+ '<p style="margin-bottom:8px"><strong>This operation modifies Elementor\'s files.</strong> Elementor CSS will be regenerated automatically.</p>'
					+ '<p>Are you sure you want to continue?</p>',
				footer: '<div style="display:flex;justify-content:flex-end;gap:8px">'
					+ '<button class="eff-btn eff-btn--secondary" id="eff-commit-cancel">Cancel</button>'
					+ '<button class="eff-btn" id="eff-commit-confirm">Commit</button>'
					+ '</div>',
			});

			// Bind modal action buttons.
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
		 * Show or hide the "Unsynced changes" indicator.
		 *
		 * Called from EFF.App.setPendingCommit(). When there are pending commits
		 * the indicator is shown; when cleared it is hidden.
		 */
		updateCommitBtn: function () {
			if (!this._unsyncedIndicator) { return; }

			var hasPending = EFF.state.hasPendingElementorCommit;
			if (hasPending) {
				this._unsyncedIndicator.removeAttribute('hidden');
			} else {
				this._unsyncedIndicator.setAttribute('hidden', '');
			}
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
		 * Get the current filename input value, trimmed.
		 *
		 * @returns {string}
		 */
		_getFilename: function () {
			if (!this._filenameInput) {
				return '';
			}
			return this._filenameInput.value.trim();
		},
	};
}());
