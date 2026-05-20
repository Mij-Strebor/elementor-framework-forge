/**
 * AFF Print — Variable Print / PDF Feature
 *
 * Renders a print-ready document from AFF.state.variables for Colors,
 * Fonts, and Numbers. Opens a selection modal; user chooses which sets
 * to include and presses Print (or Enter). The document is injected into
 * a hidden #aff-print-container div; @media print CSS hides the AFF UI
 * and shows only that container.
 *
 * @package AtomicFrameworkForge
 */

(function () {
	'use strict';

	window.AFF = window.AFF || {};

	AFF.Print = {

		// -------------------------------------------------------------------
		// INIT
		// -------------------------------------------------------------------

		_enterHandler:   null,
		_enterHandlerEl: null,

		init: function () {
			var btn = document.getElementById('aff-btn-print');
			if (btn) {
				btn.addEventListener('click', this._openModal.bind(this));
			}

		},

		// -------------------------------------------------------------------
		// MODAL
		// -------------------------------------------------------------------

		_openModal: function () {
			var self  = this;
			var vars  = AFF.state.variables || [];
			var hasColors  = vars.some(function (v) { return v.type === 'color'  && v.status !== 'deleted'; });
			var hasFonts   = vars.some(function (v) { return v.type === 'font'   && v.status !== 'deleted'; });
			var hasNumbers = vars.some(function (v) { return v.type === 'number' && v.status !== 'deleted'; });

			var counts = {
				colors:  vars.filter(function (v) { return v.type === 'color'  && v.status !== 'deleted'; }).length,
				fonts:   vars.filter(function (v) { return v.type === 'font'   && v.status !== 'deleted'; }).length,
				numbers: vars.filter(function (v) { return v.type === 'number' && v.status !== 'deleted'; }).length,
			};

			var body = '<div class="aff-print-select">'
				+ '<p class="aff-print-select__hint">Select which variable sets to include:</p>'
				+ self._chk('aff-pchk-colors',  'Colors',  counts.colors,  hasColors)
				+ self._chk('aff-pchk-fonts',   'Fonts',   counts.fonts,   hasFonts)
				+ self._chk('aff-pchk-numbers', 'Numbers', counts.numbers, hasNumbers)
				+ '</div>';

			var footer = '<button class="aff-btn" id="aff-print-cancel">Cancel</button>'
				+ '<button class="aff-btn aff-btn--primary" id="aff-print-go">Print</button>';

			AFF.Modal.open({
				title:   'Print Variables',
				body:    body,
				footer:  footer,
				onClose: function () { self._removeEnterHandler(); },
			});

			// Wire footer buttons after Modal has injected them
			requestAnimationFrame(function () {
				var goBtn     = document.getElementById('aff-print-go');
				var cancelBtn = document.getElementById('aff-print-cancel');

				if (goBtn) {
					goBtn.addEventListener('click', function () {
						self._doPrint();
					});
				}
				if (cancelBtn) {
					cancelBtn.addEventListener('click', function () {
						AFF.Modal.close();
					});
				}

				// Enter key triggers Print only while the print modal is open.
				// Stored on self so _removeEnterHandler() can clean it up.
				var modalEl = document.getElementById('aff-modal');
				if (modalEl) {
					self._enterHandler = function (e) {
						if (e.key === 'Enter') {
							e.preventDefault();
							self._doPrint();
						}
					};
					modalEl.addEventListener('keydown', self._enterHandler);
					self._enterHandlerEl = modalEl;
				}
			});
		},

		_chk: function (id, label, count, enabled) {
			var disabledAttr = enabled ? '' : ' disabled';
			var checkedAttr  = enabled ? ' checked' : '';
			var countStr     = enabled ? ' <span class="aff-print-chk-count">(' + count + ')</span>' : ' <span class="aff-print-chk-empty">(none loaded)</span>';
			return '<label class="aff-print-chk-row' + (enabled ? '' : ' aff-print-chk-row--disabled') + '">'
				+ '<input type="checkbox" id="' + id + '"' + checkedAttr + disabledAttr + '>'
				+ ' ' + label + countStr
				+ '</label>';
		},

		// -------------------------------------------------------------------
		// PRINT
		// -------------------------------------------------------------------

		_removeEnterHandler: function () {
			if (this._enterHandlerEl && this._enterHandler) {
				this._enterHandlerEl.removeEventListener('keydown', this._enterHandler);
			}
			this._enterHandler    = null;
			this._enterHandlerEl  = null;
		},

		_doPrint: function () {
			this._removeEnterHandler();

			var selection = {
				colors:  this._isChecked('aff-pchk-colors'),
				fonts:   this._isChecked('aff-pchk-fonts'),
				numbers: this._isChecked('aff-pchk-numbers'),
			};

			AFF.Modal.close();

			var cssUrl  = (typeof AFFData !== 'undefined' ? AFFData.pluginUrl : '') + 'admin/css/aff-print-page.css';
			var docHtml = this._buildDoc(selection);

			// Open a clean new window — no WP admin DOM or styles, so no blank
			// first page. The browser's print dialog includes "Save as PDF".
			var win = window.open('', '_blank', 'width=900,height=700');
			if (!win) { return; }

			win.document.write(
				'<!DOCTYPE html>'
				+ '<html><head>'
				+ '<meta charset="utf-8">'
				+ '<title>AFF Variables</title>'
				+ '<link rel="stylesheet" href="' + cssUrl + '">'
				+ '</head><body>'
				+ docHtml
				+ '<scr' + 'ipt>'
				+ 'window.onload = function () {'
				+ '  setTimeout(function () { window.print(); }, 200);'
				+ '};'
				+ '</scr' + 'ipt>'
				+ '</body></html>'
			);
			win.document.close();
		},

		_isChecked: function (id) {
			var el = document.getElementById(id);
			return el ? el.checked : false;
		},

		// -------------------------------------------------------------------
		// DOCUMENT BUILDER
		// -------------------------------------------------------------------

		_buildDoc: function (selection) {
			var vars    = AFF.state.variables || [];
			var project = (typeof AFFData !== 'undefined' && AFFData.siteName) ? AFFData.siteName : '';
			var date    = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

			var active = vars.filter(function (v) { return v.status !== 'deleted'; });
			var total  = 0;
			if (selection.colors)  { total += active.filter(function (v) { return v.type === 'color'; }).length; }
			if (selection.fonts)   { total += active.filter(function (v) { return v.type === 'font'; }).length; }
			if (selection.numbers) { total += active.filter(function (v) { return v.type === 'number'; }).length; }

			var html = '<div class="aff-print-doc">';

			// Document header
			html += '<header class="aff-print-doc-header">'
				+ '<div class="aff-print-doc-header__title">Atomic Framework Forge for Elementor V4</div>'
				+ '<div class="aff-print-doc-header__project">Website: ' + this._esc(project) + '</div>'
				+ '<div class="aff-print-doc-header__date">Printed: ' + this._esc(date) + '</div>'
				+ '<div class="aff-print-doc-header__count">Count: ' + total + ' variable' + (total !== 1 ? 's' : '') + '</div>'
				+ '</header>';

			if (selection.colors) {
				html += this._buildSection('color',  'Colors',  active, this._colorsRow.bind(this));
			}
			if (selection.fonts) {
				html += this._buildSection('font',   'Fonts',   active, this._fontsRow.bind(this));
			}
			if (selection.numbers) {
				html += this._buildSection('number', 'Numbers', active, this._numbersRow.bind(this));
			}

			html += '</div>';
			return html;
		},

		_buildSection: function (type, label, allVars, rowFn) {
			var vars = allVars.filter(function (v) { return v.type === type; });
			if (!vars.length) { return ''; }

			// Preserve display order: walk config categories in their stored order,
			// then collect each category's vars in AFF.state.variables order.
			var catKeyMap = { color: 'categories', font: 'fontCategories', number: 'numberCategories' };
			var cats      = (AFF.state.config && AFF.state.config[catKeyMap[type]]) || [];
			var ordered   = [];
			var placed    = {};

			for (var ci = 0; ci < cats.length; ci++) {
				var catId = cats[ci].id;
				for (var vi = 0; vi < vars.length; vi++) {
					if (vars[vi].category_id === catId && !placed[vars[vi].id]) {
						ordered.push(vars[vi]);
						placed[vars[vi].id] = true;
					}
				}
			}
			// Append any vars not matched to a known category (Uncategorized)
			for (var ui = 0; ui < vars.length; ui++) {
				if (!placed[vars[ui].id]) { ordered.push(vars[ui]); }
			}
			vars = ordered;

			var hasPreview = (type === 'color' || type === 'font');

			var html = '<section class="aff-print-section aff-print-section--' + type + '">'
				+ '<h2 class="aff-print-section-title">'
				+ '<span class="aff-print-section-badge aff-print-section-badge--' + type + '">'
				+ this._esc(label)
				+ '<span class="aff-print-section-count">' + vars.length + ' variable' + (vars.length !== 1 ? 's' : '') + '</span>'
				+ '</span>'
				+ '</h2>'
				+ '<table class="aff-print-table">'
				+ '<thead><tr>'
				+ (hasPreview ? '<th class="aff-ptcol-preview" scope="col"></th>' : '')
				+ '<th class="aff-ptcol-name" scope="col">Name</th>'
				+ '<th class="aff-ptcol-val" scope="col">Value</th>'
				+ '<th class="aff-ptcol-fmt" scope="col">Format</th>'
				+ '</tr></thead>'
				+ '<tbody>';

			var prevCat = null;
			for (var i = 0; i < vars.length; i++) {
				var v   = vars[i];
				var cat = v.category || 'Uncategorized';
				if (cat !== prevCat) {
					html += '<tr class="aff-print-cat-row"><td colspan="' + (hasPreview ? 4 : 3) + '">' + this._esc(cat) + '</td></tr>';
					prevCat = cat;
				}
				html += rowFn(v);
			}

			html += '</tbody></table></section>';
			return html;
		},

		_colorsRow: function (v) {
			return '<tr>'
				+ '<td class="aff-ptcol-preview"><span class="aff-print-swatch" style="background:' + this._esc(v.value || '') + '"></span></td>'
				+ '<td class="aff-ptcol-name aff-print-varname">' + this._esc(v.name || '') + '</td>'
				+ '<td class="aff-ptcol-val aff-print-monospace">' + this._esc(v.value || '') + '</td>'
				+ '<td class="aff-ptcol-fmt">' + this._esc(v.format || '') + '</td>'
				+ '</tr>';
		},

		_fontsRow: function (v) {
			return '<tr>'
				+ '<td class="aff-ptcol-preview"><span class="aff-print-font-preview" style="font-family:' + this._esc(v.value || '') + '">ABCabc</span></td>'
				+ '<td class="aff-ptcol-name aff-print-varname">' + this._esc(v.name || '') + '</td>'
				+ '<td class="aff-ptcol-val">' + this._esc(v.value || '') + '</td>'
				+ '<td class="aff-ptcol-fmt">' + this._esc(v.format || '') + '</td>'
				+ '</tr>';
		},

		_numbersRow: function (v) {
			return '<tr>'
				+ '<td class="aff-ptcol-name aff-print-varname">' + this._esc(v.name || '') + '</td>'
				+ '<td class="aff-ptcol-val aff-print-monospace">' + this._esc(v.value || '') + '</td>'
				+ '<td class="aff-ptcol-fmt">' + this._esc(v.format || '') + '</td>'
				+ '</tr>';
		},

		// -------------------------------------------------------------------
		// UTILITIES
		// -------------------------------------------------------------------

		_esc: function (str) {
			return String(str)
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;');
		},
	};

})();
