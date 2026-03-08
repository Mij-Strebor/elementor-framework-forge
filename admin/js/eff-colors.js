/**
 * EFF Colors — Phase 2 Colors Edit Space
 *
 * Intercepts EFF.EditSpace.loadCategory() for the Colors subgroup and
 * renders a full editing workspace: category blocks with color variable rows,
 * inline expand panels (color picker + tint/shade generator), category
 * management (add/rename/delete/reorder/duplicate), and undo/redo.
 *
 * Phases implemented in this file:
 *   Phase 2b: Category blocks, color variable rows (read-only display)
 *   Phase 2c: Inline editing, category CRUD, undo/redo
 *   Phase 2d: Expand panel (color picker + generator + preview)
 *   Phase 2e: Status dots (rendered; sync decision tree in eff-app.js)
 *
 * JS standard: ES5 IIFE, 'use strict', var only, no arrow functions.
 *
 * @package ElementorFrameworkForge
 */

(function () {
	'use strict';

	window.EFF = window.EFF || {};

	// -----------------------------------------------------------------------
	// UNDO / REDO STACK
	// -----------------------------------------------------------------------

	var _undoStack = [];   // max 50 entries
	var _redoStack = [];
	var UNDO_LIMIT = 50;

	/**
	 * Push an operation to the undo stack.
	 *
	 * @param {{ type: string, data: Object }} op Operation descriptor.
	 */
	function pushUndo(op) {
		_undoStack.push(op);
		if (_undoStack.length > UNDO_LIMIT) {
			_undoStack.shift();
		}
		_redoStack = []; // Any new action clears the redo stack.
	}

	// -----------------------------------------------------------------------
	// MODULE
	// -----------------------------------------------------------------------

	EFF.Colors = {

		/**
		 * The currently open expand panel's variable ID, or null.
		 * @type {string|null}
		 */
		_openExpandId: null,

		/**
		 * Initialize: intercept EFF.EditSpace.loadCategory for Colors subgroup.
		 */
		init: function () {
			var _original = EFF.EditSpace.loadCategory.bind(EFF.EditSpace);

			EFF.EditSpace.loadCategory = function (selection) {
				if (selection && selection.subgroup === 'Colors') {
					EFF.Colors.loadColors(selection);
				} else {
					_original(selection);
				}
			};

			// Undo/redo keyboard handler.
			document.addEventListener('keydown', function (e) {
				if (!e.ctrlKey && !e.metaKey) { return; }
				if (e.key === 'z' || e.key === 'Z') {
					e.preventDefault();
					EFF.Colors.undo();
				} else if (e.key === 'y' || e.key === 'Y') {
					e.preventDefault();
					EFF.Colors.redo();
				}
			});
		},

		/**
		 * Entry point called by the overridden EFF.EditSpace.loadCategory.
		 *
		 * @param {{ group: string, subgroup: string, category: string }} selection
		 */
		loadColors: function (selection) {
			var placeholder = document.getElementById('eff-placeholder');
			var content     = document.getElementById('eff-edit-content');
			var workspace   = document.getElementById('eff-workspace');

			if (!content) { return; }

			if (workspace) {
				workspace.setAttribute('data-active', 'true');
			}
			if (placeholder) {
				placeholder.setAttribute('hidden', '');
			}
			content.removeAttribute('hidden');

			this._renderAll(selection, content);
		},

		// -----------------------------------------------------------------------
		// RENDER
		// -----------------------------------------------------------------------

		/**
		 * Build and inject the full Colors view HTML into the content element.
		 *
		 * @param {{ group: string, subgroup: string, category: string }} selection
		 * @param {HTMLElement} container
		 */
		_renderAll: function (selection, container) {
			var self        = this;
			var categories  = (EFF.state.config && EFF.state.config.categories)
				? EFF.state.config.categories.slice().sort(function (a, b) {
					return (a.order || 0) - (b.order || 0);
				})
				: self._getDefaultCategories();

			var html = '<div class="eff-colors-view">';

			// Filter bar.
			html += '<div class="eff-colors-filter-bar">'
				+ '<input type="text" class="eff-colors-search" id="eff-colors-search"'
				+ ' placeholder="Search variables..." aria-label="Search color variables">'
				+ '<button class="eff-colors-filter-btn" id="eff-colors-expand-all" title="Expand all categories">Expand all</button>'
				+ '<button class="eff-colors-filter-btn" id="eff-colors-collapse-all" title="Collapse all categories">Collapse all</button>'
				+ '<button class="eff-colors-filter-btn eff-btn eff-btn--secondary" id="eff-colors-add-category" title="Add a new color category">+ Category</button>'
				+ '</div>';

			// Category blocks.
			if (categories.length === 0) {
				html += '<p class="eff-colors-empty">No categories found. Click "+ Category" to add one.</p>';
			} else {
				for (var i = 0; i < categories.length; i++) {
					html += self._buildCategoryBlock(categories[i]);
				}
			}

			html += '</div>'; // .eff-colors-view

			container.innerHTML = html;

			// Bind all interactive elements.
			self._bindEvents(container);
		},

		/**
		 * Return built-in default categories if config has none yet.
		 * @returns {Array}
		 */
		_getDefaultCategories: function () {
			return [
				{ id: 'default-branding',       name: 'Branding',      order: 0, locked: false },
				{ id: 'default-background',      name: 'Background',    order: 1, locked: false },
				{ id: 'default-neutral',         name: 'Neutral',       order: 2, locked: false },
				{ id: 'default-semantic',        name: 'Semantic',      order: 3, locked: false },
				{ id: 'default-uncategorized',   name: 'Uncategorized', order: 4, locked: true  },
			];
		},

		/**
		 * Build the HTML for one category block.
		 *
		 * @param {{ id: string, name: string, locked: boolean }} cat
		 * @returns {string}
		 */
		_buildCategoryBlock: function (cat) {
			var self = this;
			var vars = self._getVarsForCategory(cat);
			var count = vars.length;

			var html = '<div class="eff-category-block" data-category-id="' + this._esc(cat.id) + '">';

			// Category header.
			html += '<div class="eff-category-header">'
				+ '<span class="eff-category-name">' + this._esc(cat.name) + '</span>'
				+ '<span class="eff-category-count">' + count + '</span>'
				+ '<div class="eff-category-actions" role="toolbar" aria-label="Category actions">'
				+ this._catBtn('duplicate', 'Duplicate category', '⧉', '')
				+ this._catBtn('move-up',   'Move category up',   '↑', '')
				+ this._catBtn('move-down', 'Move category down', '↓', '')
				+ this._catBtn('rename',    'Rename category',    '✎', '')
				+ this._catBtn('add-var',   'Add variable to this category', '+', '')
				+ (cat.locked ? '' : this._catBtn('delete',  'Delete category', '✕', 'eff-icon-btn--danger'))
				+ this._catBtn('collapse',  'Collapse/expand category', '▾', 'eff-category-collapse-btn')
				+ '</div>'
				+ '</div>'; // .eff-category-header

			// Column headings (shown only when vars exist).
			if (count > 0) {
				html += '<div class="eff-color-list-header" aria-hidden="true">'
					+ '<span></span>'  // status dot
					+ '<span></span>'  // swatch
					+ '<span>Variable</span>'
					+ '<span>Value</span>'
					+ '<span>Format</span>'
					+ '<span></span>'  // expand
					+ '</div>';
			}

			// Variable rows.
			html += '<div class="eff-color-list">';
			if (count === 0) {
				html += '<p class="eff-colors-empty">No variables in this category. Click "+" to add one.</p>';
			} else {
				for (var i = 0; i < vars.length; i++) {
					html += self._buildVariableRow(vars[i]);
				}
			}
			html += '</div>'; // .eff-color-list

			// Add variable footer.
			html += '<button class="eff-color-add-row" data-category-id="' + this._esc(cat.id) + '"'
				+ ' data-category-name="' + this._esc(cat.name) + '"'
				+ ' aria-label="Add variable to ' + this._esc(cat.name) + '">'
				+ '+ Add variable'
				+ '</button>';

			html += '</div>'; // .eff-category-block
			return html;
		},

		/**
		 * Build one category action icon button.
		 *
		 * @param {string} action    data-action value
		 * @param {string} label     aria-label
		 * @param {string} icon      Text/emoji icon
		 * @param {string} extraClass Additional CSS class
		 * @returns {string}
		 */
		_catBtn: function (action, label, icon, extraClass) {
			return '<button class="eff-icon-btn ' + (extraClass || '') + '"'
				+ ' data-action="' + action + '"'
				+ ' aria-label="' + this._esc(label) + '"'
				+ ' title="' + this._esc(label) + '">'
				+ icon
				+ '</button>';
		},

		/**
		 * Build the HTML for a single color variable row.
		 *
		 * @param {Object} v Variable object.
		 * @returns {string}
		 */
		_buildVariableRow: function (v) {
			var status     = v.status || 'synced';
			var statusColor = this._statusColor(status);
			var swatchBg   = this._esc(v.value || '');
			var isExpanded = (this._openExpandId === v.id) ? ' data-expanded="true"' : '';

			var html = '<div class="eff-color-row"'
				+ isExpanded
				+ ' data-var-id="' + this._esc(v.id) + '">'

				// Status dot (Phase 2e — always rendered, visible once status is set).
				+ '<span class="eff-status-dot"'
				+ ' style="background:' + statusColor + '"'
				+ ' title="Status: ' + this._esc(status) + '"'
				+ ' aria-label="Status: ' + this._esc(status) + '">'
				+ '</span>'

				// Color swatch.
				+ '<span class="eff-color-swatch"'
				+ ' style="background:' + swatchBg + '"'
				+ ' data-action="open-picker"'
				+ ' aria-label="Color swatch — click expand to pick">'
				+ '</span>'

				// Name input (Phase 2c — always editable).
				+ '<div class="eff-color-name-field">'
				+ '<input type="text" class="eff-color-name-input"'
				+ ' value="' + this._esc(v.name) + '"'
				+ ' data-original="' + this._esc(v.name) + '"'
				+ ' aria-label="Variable name"'
				+ ' spellcheck="false">'
				+ '</div>'

				// Value input.
				+ '<input type="text" class="eff-color-value-input"'
				+ ' value="' + this._esc(v.value || '') + '"'
				+ ' data-original="' + this._esc(v.value || '') + '"'
				+ ' aria-label="Color value"'
				+ ' spellcheck="false">'

				// Format selector.
				+ '<select class="eff-color-format-sel" aria-label="Color format">'
				+ this._formatOptions(v.format || 'HEX')
				+ '</select>'

				// Expand button.
				+ '<button class="eff-icon-btn eff-color-expand-btn"'
				+ ' data-action="expand"'
				+ ' aria-label="' + (isExpanded ? 'Collapse' : 'Expand') + ' color editor"'
				+ ' aria-expanded="' + (isExpanded ? 'true' : 'false') + '">'
				+ this._chevronSVG()
				+ '</button>'

				+ '</div>'; // .eff-color-row

			// If this row's expand panel is open, include it immediately after.
			if (this._openExpandId === v.id) {
				html += this._buildExpandPanel(v);
			}

			return html;
		},

		/**
		 * Build the <select> options for the format field.
		 *
		 * @param {string} current Currently selected format value.
		 * @returns {string} HTML option string.
		 */
		_formatOptions: function (current) {
			var formats = ['HEX', 'HEXA', 'RGB', 'RGBA', 'HSL', 'HSLA'];
			var html = '';
			for (var i = 0; i < formats.length; i++) {
				var sel = (formats[i] === current) ? ' selected' : '';
				html += '<option value="' + formats[i] + '"' + sel + '>' + formats[i] + '</option>';
			}
			return html;
		},

		/**
		 * Build the inline expand panel for a variable.
		 *
		 * @param {Object} v Variable object.
		 * @returns {string}
		 */
		_buildExpandPanel: function (v) {
			var self     = this;
			var children = self._getChildVars(v.id);
			var tints    = children.filter(function (c) { return c.name.indexOf('-plus-') !== -1; });
			var shades   = children.filter(function (c) { return c.name.indexOf('-minus-') !== -1; });

			// Parse current hex for picker.
			var hex6     = self._parseHex6(v.value || '');
			var alphaVal = self._parseAlpha(v.value || '');
			var alphaPct = Math.round(alphaVal * 100);

			var html = '<div class="eff-expand-panel" data-expand-for="' + self._esc(v.id) + '">';

			// Zone 1 — Generator controls.
			html += '<div class="eff-expand-zone eff-expand-zone--generator">'
				+ '<div class="eff-expand-zone-label">Generate</div>'

				+ '<div class="eff-gen-row">'
				+ '<label for="eff-gen-tints-' + self._esc(v.id) + '">Tints</label>'
				+ '<select id="eff-gen-tints-' + self._esc(v.id) + '" class="eff-gen-tints">'
				+ '<option value="0">Off</option>'
				+ '<option value="3">3-step (300/600/900)</option>'
				+ '<option value="9">9-step (100–900)</option>'
				+ '</select>'
				+ '</div>'

				+ '<div class="eff-gen-row">'
				+ '<label for="eff-gen-shades-' + self._esc(v.id) + '">Shades</label>'
				+ '<select id="eff-gen-shades-' + self._esc(v.id) + '" class="eff-gen-shades">'
				+ '<option value="0">Off</option>'
				+ '<option value="3">3-step (300/600/900)</option>'
				+ '<option value="9">9-step (100–900)</option>'
				+ '</select>'
				+ '</div>'

				+ '<div class="eff-gen-row">'
				+ '<label for="eff-gen-trans-' + self._esc(v.id) + '">Transparencies</label>'
				+ '<select id="eff-gen-trans-' + self._esc(v.id) + '" class="eff-gen-trans">'
				+ '<option value="0">Off</option>'
				+ '<option value="5">5 steps</option>'
				+ '<option value="10">10 steps</option>'
				+ '</select>'
				+ '</div>'

				+ '<button class="eff-btn eff-btn--secondary eff-gen-generate-btn" data-var-id="' + self._esc(v.id) + '">Generate</button>'
				+ '</div>'; // Zone 1

			// Zone 2 — Preview bars (conditional on existing children).
			html += '<div class="eff-expand-zone eff-expand-zone--preview"'
				+ (children.length === 0 ? ' hidden' : '') + '>'
				+ '<div class="eff-expand-zone-label">Preview</div>';

			if (tints.length > 0) {
				html += '<div class="eff-swatch-preview-row">';
				for (var t = 0; t < tints.length; t++) {
					var tStep = tints[t].name.replace(/.*-plus-/, '+');
					html += '<div class="eff-preview-swatch">'
						+ '<span class="eff-preview-swatch-color" style="background:' + self._esc(tints[t].value || '') + '"></span>'
						+ '<span class="eff-preview-swatch-label">' + self._esc(tStep) + '</span>'
						+ '</div>';
				}
				html += '</div>';
			}

			if (shades.length > 0) {
				html += '<div class="eff-swatch-preview-row">';
				for (var s = 0; s < shades.length; s++) {
					var sStep = shades[s].name.replace(/.*-minus-/, '-');
					html += '<div class="eff-preview-swatch">'
						+ '<span class="eff-preview-swatch-color" style="background:' + self._esc(shades[s].value || '') + '"></span>'
						+ '<span class="eff-preview-swatch-label">' + self._esc(sStep) + '</span>'
						+ '</div>';
				}
				html += '</div>';
			}

			html += '</div>'; // Zone 2

			// Zone 3 — Color picker.
			html += '<div class="eff-expand-zone eff-expand-zone--picker">'
				+ '<div class="eff-expand-zone-label">Color picker</div>'
				+ '<div class="eff-picker-row">'
				+ '<input type="color" class="eff-native-picker"'
				+ ' value="' + self._esc(hex6 || '#000000') + '"'
				+ ' data-var-id="' + self._esc(v.id) + '"'
				+ ' aria-label="Color picker">'
				+ '<input type="text" class="eff-hex-input"'
				+ ' value="' + self._esc(hex6 || '') + '"'
				+ ' placeholder="#000000"'
				+ ' data-var-id="' + self._esc(v.id) + '"'
				+ ' aria-label="Hex color value"'
				+ ' spellcheck="false"'
				+ ' maxlength="7">'
				+ '</div>'
				+ '<div class="eff-alpha-row">'
				+ '<label for="eff-alpha-' + self._esc(v.id) + '">Alpha</label>'
				+ '<input type="range" class="eff-alpha-slider"'
				+ ' id="eff-alpha-' + self._esc(v.id) + '"'
				+ ' min="0" max="100" value="' + alphaPct + '"'
				+ ' data-var-id="' + self._esc(v.id) + '"'
				+ ' aria-label="Alpha channel (' + alphaPct + '%)">'
				+ '<span class="eff-alpha-value">' + alphaPct + '%</span>'
				+ '</div>'
				+ '</div>'; // Zone 3

			html += '</div>'; // .eff-expand-panel
			return html;
		},

		// -----------------------------------------------------------------------
		// EVENT BINDING
		// -----------------------------------------------------------------------

		/**
		 * Bind all interactive events after rendering.
		 *
		 * Uses event delegation on the container for efficiency.
		 *
		 * @param {HTMLElement} container The #eff-edit-content element.
		 */
		_bindEvents: function (container) {
			var self = this;

			// ---- Filter bar ----
			var searchInput = container.querySelector('#eff-colors-search');
			if (searchInput) {
				searchInput.addEventListener('input', function () {
					self._filterRows(container, this.value);
				});
			}

			var expandAll = container.querySelector('#eff-colors-expand-all');
			if (expandAll) {
				expandAll.addEventListener('click', function () {
					self._setAllCollapsed(container, false);
				});
			}

			var collapseAll = container.querySelector('#eff-colors-collapse-all');
			if (collapseAll) {
				collapseAll.addEventListener('click', function () {
					self._setAllCollapsed(container, true);
				});
			}

			var addCatBtn = container.querySelector('#eff-colors-add-category');
			if (addCatBtn) {
				addCatBtn.addEventListener('click', function () {
					self._addCategory();
				});
			}

			// ---- Delegated events on category blocks ----
			container.addEventListener('click', function (e) {
				var target = e.target;

				// Find nearest button with data-action.
				var btn = target.closest('[data-action]');
				if (!btn) { return; }

				var action = btn.getAttribute('data-action');
				var block  = btn.closest('.eff-category-block');
				var catId  = block ? block.getAttribute('data-category-id') : null;

				switch (action) {

					case 'duplicate': if (catId) { self._duplicateCategory(catId); } break;
					case 'move-up':   if (catId) { self._moveCategoryUp(catId); } break;
					case 'move-down': if (catId) { self._moveCategoryDown(catId); } break;
					case 'rename':    if (catId) { self._startCategoryRename(block, catId); } break;
					case 'add-var':   if (catId) { self._addVariable(catId, block); } break;
					case 'delete':    if (catId) { self._deleteCategory(catId); } break;

					case 'collapse':
						if (block) {
							var collapsed = block.getAttribute('data-collapsed') === 'true';
							block.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
						}
						break;

					case 'expand':
						var row    = btn.closest('.eff-color-row');
						var varId  = row ? row.getAttribute('data-var-id') : null;
						if (varId) { self._toggleExpandPanel(varId, row, container); }
						break;

					case 'open-picker':
						// Swatch click → open expand panel for this row.
						var swatchRow = target.closest('.eff-color-row');
						var swVarId   = swatchRow ? swatchRow.getAttribute('data-var-id') : null;
						if (swVarId) { self._toggleExpandPanel(swVarId, swatchRow, container); }
						break;
				}
			});

			// ---- Add variable footer buttons ----
			container.addEventListener('click', function (e) {
				var addBtn = e.target.closest('.eff-color-add-row');
				if (!addBtn) { return; }
				var catId = addBtn.getAttribute('data-category-id');
				if (catId) { self._addVariable(catId, addBtn.parentElement); }
			});

			// ---- Generate children button ----
			container.addEventListener('click', function (e) {
				var genBtn = e.target.closest('.eff-gen-generate-btn');
				if (!genBtn) { return; }
				var varId = genBtn.getAttribute('data-var-id');
				if (varId) { self._generateChildren(varId, genBtn.closest('.eff-expand-panel')); }
			});

			// ---- Name input: save on blur and Enter ----
			container.addEventListener('change', function (e) {
				var nameInput = e.target.closest('.eff-color-name-input');
				if (!nameInput) { return; }
				var row   = nameInput.closest('.eff-color-row');
				var varId = row ? row.getAttribute('data-var-id') : null;
				if (varId) { self._saveVarName(varId, nameInput); }
			});
			container.addEventListener('keydown', function (e) {
				if (e.key !== 'Enter') { return; }
				var nameInput = e.target.closest('.eff-color-name-input');
				if (!nameInput) { return; }
				nameInput.blur();
			});

			// ---- Value input: save on blur and Enter ----
			container.addEventListener('change', function (e) {
				var valueInput = e.target.closest('.eff-color-value-input');
				if (!valueInput) { return; }
				var row   = valueInput.closest('.eff-color-row');
				var varId = row ? row.getAttribute('data-var-id') : null;
				if (varId) { self._saveVarValue(varId, valueInput.value, valueInput); }
			});
			container.addEventListener('keydown', function (e) {
				if (e.key !== 'Enter') { return; }
				var valueInput = e.target.closest('.eff-color-value-input');
				if (!valueInput) { return; }
				valueInput.blur();
			});

			// ---- Format selector: save on change ----
			container.addEventListener('change', function (e) {
				var formatSel = e.target.closest('.eff-color-format-sel');
				if (!formatSel) { return; }
				var row   = formatSel.closest('.eff-color-row');
				var varId = row ? row.getAttribute('data-var-id') : null;
				if (varId) { self._saveVarFormat(varId, formatSel.value); }
			});

			// ---- Color picker Zone 3 ----
			// Native color picker → update hex input and save.
			container.addEventListener('change', function (e) {
				var picker = e.target.closest('.eff-native-picker');
				if (!picker) { return; }
				var varId  = picker.getAttribute('data-var-id');
				var panel  = picker.closest('.eff-expand-panel');
				if (!varId || !panel) { return; }
				var newHex     = picker.value; // e.g., '#3d2f1f'
				var alphaSlider = panel.querySelector('.eff-alpha-slider');
				var alphaVal   = alphaSlider ? parseInt(alphaSlider.value, 10) : 100;
				var fullValue  = self._combineHexAlpha(newHex, alphaVal);

				// Update hex text input.
				var hexInput = panel.querySelector('.eff-hex-input');
				if (hexInput) { hexInput.value = newHex; }

				self._saveVarValue(varId, fullValue, null);
				// Update the swatch in the row immediately.
				self._updateSwatchInDOM(varId, fullValue);
			});

			// Hex text input → update picker and save.
			container.addEventListener('change', function (e) {
				var hexInput = e.target.closest('.eff-hex-input');
				if (!hexInput) { return; }
				var varId = hexInput.getAttribute('data-var-id');
				var panel  = hexInput.closest('.eff-expand-panel');
				if (!varId || !panel) { return; }

				var raw    = hexInput.value.trim();
				var hex6   = self._parseHex6(raw);
				if (!hex6) { return; } // Invalid — don't save.

				var alphaSlider = panel.querySelector('.eff-alpha-slider');
				var alphaVal   = alphaSlider ? parseInt(alphaSlider.value, 10) : 100;
				var fullValue  = self._combineHexAlpha(hex6, alphaVal);

				// Sync native picker.
				var nativePicker = panel.querySelector('.eff-native-picker');
				if (nativePicker) { nativePicker.value = hex6; }

				self._saveVarValue(varId, fullValue, null);
				self._updateSwatchInDOM(varId, fullValue);
			});
			container.addEventListener('keydown', function (e) {
				if (e.key !== 'Enter') { return; }
				var hexInput = e.target.closest('.eff-hex-input');
				if (!hexInput) { return; }
				hexInput.blur();
			});

			// Alpha slider → update alpha value label and save.
			container.addEventListener('input', function (e) {
				var slider = e.target.closest('.eff-alpha-slider');
				if (!slider) { return; }
				var panel = slider.closest('.eff-expand-panel');
				if (!panel) { return; }
				var label = panel.querySelector('.eff-alpha-value');
				if (label) { label.textContent = slider.value + '%'; }
			});
			container.addEventListener('change', function (e) {
				var slider = e.target.closest('.eff-alpha-slider');
				if (!slider) { return; }
				var varId  = slider.getAttribute('data-var-id');
				var panel  = slider.closest('.eff-expand-panel');
				if (!varId || !panel) { return; }

				var alphaVal    = parseInt(slider.value, 10);
				var nativePicker = panel.querySelector('.eff-native-picker');
				var hex6        = nativePicker ? nativePicker.value : '';
				var fullValue   = self._combineHexAlpha(hex6, alphaVal);

				self._saveVarValue(varId, fullValue, null);
				self._updateSwatchInDOM(varId, fullValue);
			});
		},

		// -----------------------------------------------------------------------
		// EXPAND PANEL
		// -----------------------------------------------------------------------

		/**
		 * Toggle the expand panel for a given variable row.
		 *
		 * @param {string}      varId     Variable ID.
		 * @param {HTMLElement} row       The .eff-color-row element.
		 * @param {HTMLElement} container The content container.
		 */
		_toggleExpandPanel: function (varId, row, container) {
			var self = this;

			// If this panel is already open, close it.
			if (self._openExpandId === varId) {
				self._closeExpandPanel(container);
				return;
			}

			// Close any currently open panel.
			self._closeExpandPanel(container);

			// Find the variable.
			var v = self._findVarById(varId);
			if (!v) { return; }

			// Mark row as expanded.
			row.setAttribute('data-expanded', 'true');
			var expandBtn = row.querySelector('.eff-color-expand-btn');
			if (expandBtn) { expandBtn.setAttribute('aria-expanded', 'true'); }

			// Insert expand panel after the row.
			var panelHtml = self._buildExpandPanel(v);
			var temp      = document.createElement('div');
			temp.innerHTML = panelHtml;
			var panelEl   = temp.firstChild;

			// Insert after the row in the DOM.
			if (row.nextSibling) {
				row.parentNode.insertBefore(panelEl, row.nextSibling);
			} else {
				row.parentNode.appendChild(panelEl);
			}

			self._openExpandId = varId;

			// Bind events specific to the expand panel (generator, picker already bound via delegation).
		},

		/**
		 * Close any open expand panel.
		 *
		 * @param {HTMLElement} container
		 */
		_closeExpandPanel: function (container) {
			if (!this._openExpandId) { return; }

			// Remove panel element.
			var panelEl = container.querySelector('.eff-expand-panel[data-expand-for="' + this._openExpandId + '"]');
			if (panelEl) { panelEl.parentNode.removeChild(panelEl); }

			// Remove expanded state from row.
			var row = container.querySelector('.eff-color-row[data-var-id="' + this._openExpandId + '"]');
			if (row) {
				row.removeAttribute('data-expanded');
				var expandBtn = row.querySelector('.eff-color-expand-btn');
				if (expandBtn) { expandBtn.setAttribute('aria-expanded', 'false'); }
			}

			this._openExpandId = null;
		},

		// -----------------------------------------------------------------------
		// VARIABLE SAVE HELPERS
		// -----------------------------------------------------------------------

		/**
		 * Save a variable's name after editing.
		 *
		 * @param {string}      varId     Variable ID.
		 * @param {HTMLElement} nameInput The name <input> element.
		 */
		_saveVarName: function (varId, nameInput) {
			var self     = this;
			var newName  = nameInput.value.trim();
			var oldName  = nameInput.getAttribute('data-original') || '';

			if (newName === oldName) { return; }

			// Basic validation: must start with --.
			if (!/^--[\w-]+$/.test(newName)) {
				nameInput.value = oldName; // Revert.
				return;
			}

			var v = self._findVarById(varId);
			if (!v) { return; }

			pushUndo({ type: 'name-change', id: varId, oldValue: oldName, newValue: newName });

			var updateData = {
				id:                  varId,
				name:                newName,
				pending_rename_from: oldName,
				status:              'modified',
			};

			self._ajaxSaveColor(updateData, function (newState) {
				nameInput.setAttribute('data-original', newName);
				if (EFF.App) { EFF.App.setDirty(true); EFF.App.setPendingCommit(true); }
			});
		},

		/**
		 * Save a variable's value after editing.
		 *
		 * @param {string}          varId    Variable ID.
		 * @param {string}          newValue New CSS value string.
		 * @param {HTMLElement|null} input   The input element to update data-original on.
		 */
		_saveVarValue: function (varId, newValue, input) {
			var self = this;
			var v    = self._findVarById(varId);
			if (!v) { return; }

			var oldValue = v.value || '';
			if (newValue === oldValue) { return; }

			pushUndo({ type: 'value-change', id: varId, oldValue: oldValue, newValue: newValue });

			var updateData = {
				id:     varId,
				value:  newValue,
				status: 'modified',
			};

			self._ajaxSaveColor(updateData, function () {
				if (input) { input.setAttribute('data-original', newValue); }
				if (EFF.App) { EFF.App.setDirty(true); EFF.App.setPendingCommit(true); }
			});
		},

		/**
		 * Save a variable's format after selection change.
		 *
		 * @param {string} varId     Variable ID.
		 * @param {string} newFormat New format string.
		 */
		_saveVarFormat: function (varId, newFormat) {
			var self = this;
			self._ajaxSaveColor({ id: varId, format: newFormat }, function () {
				if (EFF.App) { EFF.App.setDirty(true); }
			});
		},

		/**
		 * Send eff_save_color AJAX and update EFF.state.variables on success.
		 *
		 * @param {Object}   variableData Partial variable object with at least { id }.
		 * @param {Function} onSuccess    Called on success with updated state data.
		 */
		_ajaxSaveColor: function (variableData, onSuccess) {
			var self = this;

			if (!EFF.state.currentFile) { return; }

			EFF.App.ajax('eff_save_color', {
				filename: EFF.state.currentFile,
				variable: JSON.stringify(variableData),
			}).then(function (res) {
				if (res.success) {
					// Update state from server response.
					if (res.data && res.data.data && res.data.data.variables) {
						EFF.state.variables = res.data.data.variables;
					}
					if (onSuccess) { onSuccess(res.data); }
				}
			}).catch(function () {
				// Non-critical at UI level — PHP will log any server errors.
			});
		},

		// -----------------------------------------------------------------------
		// ADD / DELETE VARIABLE
		// -----------------------------------------------------------------------

		/**
		 * Add a new blank variable to a category.
		 *
		 * @param {string}      catId Category ID.
		 * @param {HTMLElement} block Category block element (for local re-render).
		 */
		_addVariable: function (catId, block) {
			var self = this;

			// Find category name.
			var cats = (EFF.state.config && EFF.state.config.categories) || [];
			var cat  = null;
			for (var i = 0; i < cats.length; i++) {
				if (cats[i].id === catId) { cat = cats[i]; break; }
			}
			var catName = cat ? cat.name : '';

			if (!EFF.state.currentFile) { return; }

			var newVar = {
				name:        '--new-color',
				value:       '#000000',
				type:        'color',
				subgroup:    'Colors',
				category:    catName,
				category_id: catId,
				format:      'HEX',
				status:      'new',
			};

			EFF.App.ajax('eff_save_color', {
				filename: EFF.state.currentFile,
				variable: JSON.stringify(newVar),
			}).then(function (res) {
				if (res.success && res.data && res.data.data) {
					EFF.state.variables = res.data.data.variables || EFF.state.variables;
					if (EFF.App) { EFF.App.setDirty(true); EFF.App.setPendingCommit(true); EFF.App.refreshCounts(); }
					// Re-render the current category view.
					self._rerenderView();
				}
			}).catch(function () {});
		},

		// -----------------------------------------------------------------------
		// CATEGORY ACTIONS
		// -----------------------------------------------------------------------

		/**
		 * Show a prompt and add a new category.
		 */
		_addCategory: function () {
			var self = this;
			var name = window.prompt('New category name:');
			if (!name || !name.trim()) { return; }
			name = name.trim();

			if (!EFF.state.currentFile) { return; }

			EFF.App.ajax('eff_save_category', {
				filename: EFF.state.currentFile,
				category: JSON.stringify({ name: name }),
			}).then(function (res) {
				if (res.success && res.data) {
					// Update config.categories in state.
					if (!EFF.state.config) { EFF.state.config = {}; }
					EFF.state.config.categories = res.data.categories;
					if (EFF.App) { EFF.App.setDirty(true); }
					self._rerenderView();
					// Also refresh left panel nav if supported.
					if (EFF.PanelLeft && EFF.PanelLeft.refresh) {
						EFF.PanelLeft.refresh();
					}
				}
			}).catch(function () {});
		},

		/**
		 * Start an inline rename for a category.
		 *
		 * Replaces the category name span with a text input temporarily.
		 *
		 * @param {HTMLElement} block Category block element.
		 * @param {string}      catId Category ID.
		 */
		_startCategoryRename: function (block, catId) {
			var self       = this;
			var header     = block.querySelector('.eff-category-header');
			var nameSpan   = header ? header.querySelector('.eff-category-name') : null;
			if (!nameSpan) { return; }

			var currentName = nameSpan.textContent || '';

			// Replace span with input.
			var input     = document.createElement('input');
			input.type    = 'text';
			input.className = 'eff-color-name-input eff-category-name-input';
			input.value   = currentName;
			input.setAttribute('aria-label', 'Category name');
			nameSpan.parentNode.replaceChild(input, nameSpan);
			input.focus();
			input.select();

			function commit() {
				var newName = input.value.trim();
				if (!newName || newName === currentName) {
					// Revert.
					var span = document.createElement('span');
					span.className   = 'eff-category-name';
					span.textContent = currentName;
					input.parentNode.replaceChild(span, input);
					return;
				}

				if (!EFF.state.currentFile) { return; }

				EFF.App.ajax('eff_save_category', {
					filename: EFF.state.currentFile,
					category: JSON.stringify({ id: catId, name: newName }),
				}).then(function (res) {
					if (res.success && res.data) {
						if (!EFF.state.config) { EFF.state.config = {}; }
						EFF.state.config.categories = res.data.categories;
						if (EFF.App) { EFF.App.setDirty(true); }
						self._rerenderView();
						if (EFF.PanelLeft && EFF.PanelLeft.refresh) {
							EFF.PanelLeft.refresh();
						}
					}
				}).catch(function () {});
			}

			input.addEventListener('blur', commit);
			input.addEventListener('keydown', function (e) {
				if (e.key === 'Enter') { input.blur(); }
				if (e.key === 'Escape') {
					input.removeEventListener('blur', commit);
					var span = document.createElement('span');
					span.className   = 'eff-category-name';
					span.textContent = currentName;
					input.parentNode.replaceChild(span, input);
				}
			});
		},

		/**
		 * Delete a category (with confirmation if it has variables).
		 *
		 * @param {string} catId Category ID.
		 */
		_deleteCategory: function (catId) {
			var self = this;
			var vars = self._getVarsForCategoryId(catId);

			if (vars.length > 0) {
				var confirmed = window.confirm(
					vars.length + ' variable(s) are in this category. '
					+ 'Delete the category anyway? Variables will be moved to Uncategorized.'
				);
				if (!confirmed) { return; }
			} else {
				var ok = window.confirm('Delete this category?');
				if (!ok) { return; }
			}

			if (!EFF.state.currentFile) { return; }

			EFF.App.ajax('eff_delete_category', {
				filename:    EFF.state.currentFile,
				category_id: catId,
			}).then(function (res) {
				if (res.success && res.data) {
					if (!EFF.state.config) { EFF.state.config = {}; }
					EFF.state.config.categories = res.data.categories;
					if (EFF.App) { EFF.App.setDirty(true); }
					self._rerenderView();
					if (EFF.PanelLeft && EFF.PanelLeft.refresh) {
						EFF.PanelLeft.refresh();
					}
				}
			}).catch(function () {});
		},

		/**
		 * Move a category up in display order.
		 *
		 * @param {string} catId Category ID to move up.
		 */
		_moveCategoryUp: function (catId) {
			var self  = this;
			var cats  = (EFF.state.config && EFF.state.config.categories)
				? EFF.state.config.categories.slice().sort(function (a, b) {
					return (a.order || 0) - (b.order || 0);
				})
				: [];

			var idx = -1;
			for (var i = 0; i < cats.length; i++) {
				if (cats[i].id === catId) { idx = i; break; }
			}
			if (idx <= 0) { return; } // Already at top.

			// Swap with the category above.
			var temp   = cats[idx - 1];
			cats[idx - 1] = cats[idx];
			cats[idx]     = temp;

			var orderedIds = cats.map(function (c) { return c.id; });
			self._ajaxReorderCategories(orderedIds);
		},

		/**
		 * Move a category down in display order.
		 *
		 * @param {string} catId Category ID to move down.
		 */
		_moveCategoryDown: function (catId) {
			var self = this;
			var cats = (EFF.state.config && EFF.state.config.categories)
				? EFF.state.config.categories.slice().sort(function (a, b) {
					return (a.order || 0) - (b.order || 0);
				})
				: [];

			var idx = -1;
			for (var i = 0; i < cats.length; i++) {
				if (cats[i].id === catId) { idx = i; break; }
			}
			if (idx < 0 || idx >= cats.length - 1) { return; } // Already at bottom.

			var temp   = cats[idx + 1];
			cats[idx + 1] = cats[idx];
			cats[idx]     = temp;

			var orderedIds = cats.map(function (c) { return c.id; });
			self._ajaxReorderCategories(orderedIds);
		},

		/**
		 * Duplicate a category and all its variables.
		 *
		 * @param {string} catId Source category ID.
		 */
		_duplicateCategory: function (catId) {
			var self = this;
			var cats = (EFF.state.config && EFF.state.config.categories) || [];
			var cat  = null;

			for (var i = 0; i < cats.length; i++) {
				if (cats[i].id === catId) { cat = cats[i]; break; }
			}
			if (!cat || !EFF.state.currentFile) { return; }

			var newName = cat.name + ' (copy)';

			EFF.App.ajax('eff_save_category', {
				filename: EFF.state.currentFile,
				category: JSON.stringify({ name: newName }),
			}).then(function (res) {
				if (!res.success || !res.data) { return; }

				var newCatId   = res.data.id;
				var newCatName = newName;

				EFF.state.config.categories = res.data.categories;

				// Duplicate all variables in the source category.
				var vars = self._getVarsForCategoryId(catId);
				var savePromises = [];

				for (var j = 0; j < vars.length; j++) {
					var v = vars[j];
					var dupVar = {
						name:        v.name + '-copy',
						value:       v.value,
						type:        v.type || 'color',
						subgroup:    v.subgroup || 'Colors',
						category:    newCatName,
						category_id: newCatId,
						format:      v.format || 'HEX',
						status:      'new',
					};
					savePromises.push(EFF.App.ajax('eff_save_color', {
						filename: EFF.state.currentFile,
						variable: JSON.stringify(dupVar),
					}));
				}

				Promise.all(savePromises).then(function (results) {
					var lastResult = results[results.length - 1];
					if (lastResult && lastResult.success && lastResult.data && lastResult.data.data) {
						EFF.state.variables = lastResult.data.data.variables;
					}
					if (EFF.App) { EFF.App.setDirty(true); EFF.App.refreshCounts(); }
					self._rerenderView();
					if (EFF.PanelLeft && EFF.PanelLeft.refresh) {
						EFF.PanelLeft.refresh();
					}
				}).catch(function () {});

			}).catch(function () {});
		},

		/**
		 * Send eff_reorder_categories and update local state.
		 *
		 * @param {string[]} orderedIds Category IDs in desired order.
		 */
		_ajaxReorderCategories: function (orderedIds) {
			var self = this;

			if (!EFF.state.currentFile) { return; }

			EFF.App.ajax('eff_reorder_categories', {
				filename:    EFF.state.currentFile,
				ordered_ids: JSON.stringify(orderedIds),
			}).then(function (res) {
				if (res.success && res.data) {
					if (!EFF.state.config) { EFF.state.config = {}; }
					EFF.state.config.categories = res.data.categories;
					if (EFF.App) { EFF.App.setDirty(true); }
					self._rerenderView();
				}
			}).catch(function () {});
		},

		// -----------------------------------------------------------------------
		// TINT/SHADE GENERATOR
		// -----------------------------------------------------------------------

		/**
		 * Read generator controls and call eff_generate_children.
		 *
		 * @param {string}      varId Variable ID.
		 * @param {HTMLElement} panel The .eff-expand-panel element.
		 */
		_generateChildren: function (varId, panel) {
			var self     = this;
			var tints    = panel.querySelector('.eff-gen-tints');
			var shades   = panel.querySelector('.eff-gen-shades');
			var trans    = panel.querySelector('.eff-gen-trans');

			if (!EFF.state.currentFile) { return; }

			EFF.App.ajax('eff_generate_children', {
				filename:       EFF.state.currentFile,
				parent_id:      varId,
				tints:          tints   ? tints.value   : '0',
				shades:         shades  ? shades.value  : '0',
				transparencies: trans   ? trans.value   : '0',
			}).then(function (res) {
				if (res.success && res.data) {
					if (res.data.data && res.data.data.variables) {
						EFF.state.variables = res.data.data.variables;
					}
					if (EFF.App) { EFF.App.setDirty(true); EFF.App.setPendingCommit(true); EFF.App.refreshCounts(); }
					self._rerenderView();
				}
			}).catch(function () {});
		},

		// -----------------------------------------------------------------------
		// UNDO / REDO
		// -----------------------------------------------------------------------

		/**
		 * Undo the last operation.
		 */
		undo: function () {
			var self = this;
			if (_undoStack.length === 0) { return; }

			var op = _undoStack.pop();
			_redoStack.push(op);

			if (op.type === 'value-change' || op.type === 'name-change') {
				var field = (op.type === 'value-change') ? 'value' : 'name';
				var update = { id: op.id, status: 'modified' };
				update[field] = op.oldValue;
				self._ajaxSaveColor(update, function () {
					if (EFF.App) { EFF.App.setDirty(true); EFF.App.setPendingCommit(true); }
					self._rerenderView();
				});
			}
		},

		/**
		 * Redo the last undone operation.
		 */
		redo: function () {
			var self = this;
			if (_redoStack.length === 0) { return; }

			var op = _redoStack.pop();
			_undoStack.push(op);

			if (op.type === 'value-change' || op.type === 'name-change') {
				var field = (op.type === 'value-change') ? 'value' : 'name';
				var update = { id: op.id, status: 'modified' };
				update[field] = op.newValue;
				self._ajaxSaveColor(update, function () {
					if (EFF.App) { EFF.App.setDirty(true); EFF.App.setPendingCommit(true); }
					self._rerenderView();
				});
			}
		},

		// -----------------------------------------------------------------------
		// FILTER
		// -----------------------------------------------------------------------

		/**
		 * Filter color rows by search query.
		 *
		 * Shows/hides rows based on whether name or value contains the query.
		 *
		 * @param {HTMLElement} container
		 * @param {string}      query
		 */
		_filterRows: function (container, query) {
			var lq   = query.toLowerCase();
			var rows = container.querySelectorAll('.eff-color-row');

			for (var i = 0; i < rows.length; i++) {
				var nameInput  = rows[i].querySelector('.eff-color-name-input');
				var valueInput = rows[i].querySelector('.eff-color-value-input');
				var name  = nameInput  ? nameInput.value.toLowerCase()  : '';
				var value = valueInput ? valueInput.value.toLowerCase() : '';

				var match = !lq || name.indexOf(lq) !== -1 || value.indexOf(lq) !== -1;
				rows[i].style.display = match ? '' : 'none';
			}
		},

		/**
		 * Expand or collapse all category blocks.
		 *
		 * @param {HTMLElement} container
		 * @param {boolean}     collapsed True to collapse, false to expand.
		 */
		_setAllCollapsed: function (container, collapsed) {
			var blocks = container.querySelectorAll('.eff-category-block');
			for (var i = 0; i < blocks.length; i++) {
				blocks[i].setAttribute('data-collapsed', collapsed ? 'true' : 'false');
			}
		},

		// -----------------------------------------------------------------------
		// RE-RENDER
		// -----------------------------------------------------------------------

		/**
		 * Re-render the Colors view after a state change.
		 *
		 * Preserves the current selection and open expand panel.
		 */
		_rerenderView: function () {
			var content = document.getElementById('eff-edit-content');
			if (!content || !EFF.state.currentSelection) { return; }

			this.loadColors(EFF.state.currentSelection);
		},

		/**
		 * Update just the swatch background in the DOM without a full re-render.
		 *
		 * @param {string} varId Variable ID.
		 * @param {string} value CSS color value.
		 */
		_updateSwatchInDOM: function (varId, value) {
			var content = document.getElementById('eff-edit-content');
			if (!content) { return; }
			var row    = content.querySelector('.eff-color-row[data-var-id="' + varId + '"]');
			if (!row) { return; }
			var swatch = row.querySelector('.eff-color-swatch');
			if (swatch) { swatch.style.background = value; }
		},

		// -----------------------------------------------------------------------
		// DATA HELPERS
		// -----------------------------------------------------------------------

		/**
		 * Get variables that belong to a given category object (by name + id).
		 *
		 * @param {{ id: string, name: string }} cat
		 * @returns {Array}
		 */
		_getVarsForCategory: function (cat) {
			return (EFF.state.variables || []).filter(function (v) {
				return v.subgroup === 'Colors'
					&& (v.category_id === cat.id || v.category === cat.name)
					&& v.status !== 'deleted';
			});
		},

		/**
		 * Get variables that belong to a given category ID.
		 *
		 * @param {string} catId
		 * @returns {Array}
		 */
		_getVarsForCategoryId: function (catId) {
			return (EFF.state.variables || []).filter(function (v) {
				return v.category_id === catId && v.status !== 'deleted';
			});
		},

		/**
		 * Get child variables (parent_id matches the given ID).
		 *
		 * @param {string} parentId
		 * @returns {Array}
		 */
		_getChildVars: function (parentId) {
			return (EFF.state.variables || []).filter(function (v) {
				return v.parent_id === parentId;
			});
		},

		/**
		 * Find a variable by ID.
		 *
		 * @param {string} id Variable UUID.
		 * @returns {Object|null}
		 */
		_findVarById: function (id) {
			var vars = EFF.state.variables || [];
			for (var i = 0; i < vars.length; i++) {
				if (vars[i].id === id) { return vars[i]; }
			}
			return null;
		},

		// -----------------------------------------------------------------------
		// COLOR UTILITIES
		// -----------------------------------------------------------------------

		/**
		 * Return the CSS color string for a status enum value.
		 *
		 * Uses CSS custom properties from eff-theme.css so it works in both themes.
		 * Falls back to a hard-coded muted color if the var() token is unavailable.
		 *
		 * @param {string} status
		 * @returns {string} CSS color string.
		 */
		_statusColor: function (status) {
			var map = {
				synced:   'var(--eff-status-synced)',
				modified: 'var(--eff-status-modified)',
				conflict: 'var(--eff-status-conflict)',
				orphaned: 'var(--eff-status-orphaned)',
				new:      'var(--eff-status-new)',
				deleted:  'var(--eff-status-deleted)',
			};
			return map[status] || 'var(--eff-status-synced)';
		},

		/**
		 * Extract a 6-character hex string from a CSS color value.
		 *
		 * Handles #rrggbb and #rrggbbaa. Returns null for non-hex values.
		 *
		 * @param {string} value CSS color value.
		 * @returns {string|null} '#rrggbb' or null.
		 */
		_parseHex6: function (value) {
			if (!value) { return null; }
			var m = value.match(/^#([0-9a-fA-F]{6})/);
			return m ? ('#' + m[1].toLowerCase()) : null;
		},

		/**
		 * Extract the alpha channel (0–1) from a CSS color value.
		 *
		 * Returns 1.0 if no alpha is present or value is not #rrggbbaa.
		 *
		 * @param {string} value CSS color value.
		 * @returns {number} Alpha 0–1.
		 */
		_parseAlpha: function (value) {
			if (!value) { return 1; }
			var m = value.match(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})$/);
			if (!m) { return 1; }
			return parseInt(m[1], 16) / 255;
		},

		/**
		 * Combine a #rrggbb hex and an alpha percentage into a CSS value.
		 *
		 * @param {string} hex6     '#rrggbb' format.
		 * @param {number} alphaPct 0–100.
		 * @returns {string} '#rrggbb' if alpha=100, '#rrggbbaa' otherwise.
		 */
		_combineHexAlpha: function (hex6, alphaPct) {
			if (alphaPct >= 100) { return hex6; }
			var alpha = Math.round((alphaPct / 100) * 255);
			var alphaHex = alpha.toString(16);
			if (alphaHex.length < 2) { alphaHex = '0' + alphaHex; }
			return hex6 + alphaHex;
		},

		/**
		 * Inline SVG chevron icon.
		 *
		 * @returns {string}
		 */
		_chevronSVG: function () {
			return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"'
				+ ' fill="none" stroke="currentColor" stroke-width="2"'
				+ ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
				+ '<polyline points="6 9 12 15 18 9"></polyline>'
				+ '</svg>';
		},

		/**
		 * Escape HTML special characters.
		 *
		 * @param {string} str
		 * @returns {string}
		 */
		_esc: function (str) {
			if (typeof str !== 'string') { return ''; }
			var div = document.createElement('div');
			div.textContent = str;
			return div.innerHTML;
		},
	};

}());
