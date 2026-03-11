#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = 'E:/projects/plugins/eff/admin/js/eff-colors.js';

var content = fs.readFileSync(path, 'utf8');
// Normalize CRLF to LF for matching
var hasCRLF = content.indexOf('\r\n') !== -1;
if (hasCRLF) {
	content = content.replace(/\r\n/g, '\n');
}

var original = content;
var log = [];

function replaceOnce(content, old, replacement, label) {
	var count = 0;
	var idx = 0;
	while (true) {
		var found = content.indexOf(old, idx);
		if (found === -1) { break; }
		count++;
		idx = found + 1;
	}
	if (count === 0) {
		log.push('ERROR: ' + label + ' — NOT FOUND');
		// Show first 80 chars of old string for debug
		log.push('  Looking for: ' + JSON.stringify(old.substring(0, 80)));
		return content;
	}
	if (count > 1) {
		log.push('WARNING: ' + label + ' — found ' + count + ' occurrences, replacing first');
		return content.replace(old, replacement);
	}
	log.push('OK: ' + label);
	return content.replace(old, replacement);
}

var t = '\t';

// ===== CHANGE 3a — standard filter: add .sort() =====
// File indentation (verified):
//   3 tabs: // Standard filter comment, return allVars.filter, });
//   4 tabs: return v.subgroup line
//   5 tabs: && conditions
var c3a_old = t.repeat(3) + '// Standard filter: match by category_id or category name.\n' +
	t.repeat(3) + 'return allVars.filter(function (v) {\n' +
	t.repeat(4) + 'return v.subgroup === \'Colors\'\n' +
	t.repeat(5) + '&& (v.category_id === cat.id || v.category === cat.name)\n' +
	t.repeat(5) + '&& v.status !== \'deleted\';\n' +
	t.repeat(3) + '});';
var c3a_new = t.repeat(3) + '// Standard filter: match by category_id or category name, sorted by order.\n' +
	t.repeat(3) + 'return allVars.filter(function (v) {\n' +
	t.repeat(4) + 'return v.subgroup === \'Colors\'\n' +
	t.repeat(5) + '&& (v.category_id === cat.id || v.category === cat.name)\n' +
	t.repeat(5) + '&& v.status !== \'deleted\';\n' +
	t.repeat(3) + '}).sort(function (a, b) {\n' +
	t.repeat(4) + 'return (a.order || 0) - (b.order || 0);\n' +
	t.repeat(3) + '});';
content = replaceOnce(content, c3a_old, c3a_new, 'CHANGE 3a');

// ===== CHANGE 3b — Uncategorized filter: add .sort() =====
// File indentation (verified):
//   4 tabs: return allVars.filter, });
//   5 tabs: body lines
var c3b_old = t.repeat(4) + 'return allVars.filter(function (v) {\n' +
	t.repeat(5) + 'if (v.subgroup !== \'Colors\' || v.status === \'deleted\') { return false; }\n' +
	t.repeat(5) + '// Explicitly assigned to this Uncategorized category.\n' +
	t.repeat(5) + 'if (v.category_id === cat.id || v.category === cat.name) { return true; }\n' +
	t.repeat(5) + '// Falls through \u2014 not matched by any other category.\n' +
	t.repeat(5) + 'var hasOtherCatId   = v.category_id && validIds[v.category_id];\n' +
	t.repeat(5) + 'var hasOtherCatName = v.category    && validNames[v.category];\n' +
	t.repeat(5) + 'return !hasOtherCatId && !hasOtherCatName;\n' +
	t.repeat(4) + '});';
var c3b_new = t.repeat(4) + 'return allVars.filter(function (v) {\n' +
	t.repeat(5) + 'if (v.subgroup !== \'Colors\' || v.status === \'deleted\') { return false; }\n' +
	t.repeat(5) + '// Explicitly assigned to this Uncategorized category.\n' +
	t.repeat(5) + 'if (v.category_id === cat.id || v.category === cat.name) { return true; }\n' +
	t.repeat(5) + '// Falls through \u2014 not matched by any other category.\n' +
	t.repeat(5) + 'var hasOtherCatId   = v.category_id && validIds[v.category_id];\n' +
	t.repeat(5) + 'var hasOtherCatName = v.category    && validNames[v.category];\n' +
	t.repeat(5) + 'return !hasOtherCatId && !hasOtherCatName;\n' +
	t.repeat(4) + '}).sort(function (a, b) {\n' +
	t.repeat(5) + 'return (a.order || 0) - (b.order || 0);\n' +
	t.repeat(4) + '});';
content = replaceOnce(content, c3b_old, c3b_new, 'CHANGE 3b');

// ===== CHANGE 4 — _buildModalContent: add Move to Category row =====
// File indentation (verified):
//   3 tabs: html += '</div>'; // .eff-modal-body, return html;
//   2 tabs: },
var c4_old = t.repeat(3) + 'html += \'</div>\'; // .eff-modal-body\n' +
	t.repeat(3) + 'return html;\n' +
	t.repeat(2) + '},';
var c4_new = t.repeat(3) + '// Move to Category row.\n' +
	t.repeat(3) + 'var allCats = (EFF.state.config && EFF.state.config.categories) ? EFF.state.config.categories : [];\n' +
	t.repeat(3) + 'var currentCatId = v.category_id || \'\';\n' +
	t.repeat(3) + 'var catOptions = \'\';\n' +
	t.repeat(3) + 'for (var ci = 0; ci < allCats.length; ci++) {\n' +
	t.repeat(4) + 'var co = allCats[ci];\n' +
	t.repeat(4) + 'catOptions += \'<option value="\' + self._esc(co.id) + \'"\'\n' +
	t.repeat(5) + '+ (co.id === currentCatId ? \' selected\' : \'\') + \'>\'\n' +
	t.repeat(5) + '+ self._esc(co.name)\n' +
	t.repeat(5) + '+ \'</option>\';\n' +
	t.repeat(3) + '}\n' +
	'\n' +
	t.repeat(3) + 'if (allCats.length > 1) {\n' +
	t.repeat(4) + 'html += \'<div class="eff-modal-gen-row">\'\n' +
	t.repeat(5) + '+ \'<span class="eff-modal-gen-label">Move to Category</span>\'\n' +
	t.repeat(5) + '+ \'<div class="eff-modal-gen-ctrl" style="width:auto;flex:1">\'\n' +
	t.repeat(5) + '+ \'<select class="eff-cat-move-select" data-var-id="\' + self._esc(rowKey) + \'">\'\n' +
	t.repeat(5) + '+ catOptions\n' +
	t.repeat(5) + '+ \'</select>\'\n' +
	t.repeat(5) + '+ \'</div>\'\n' +
	t.repeat(5) + '+ \'</div>\';\n' +
	t.repeat(3) + '}\n' +
	'\n' +
	t.repeat(3) + 'html += \'</div>\'; // .eff-modal-body\n' +
	t.repeat(3) + 'return html;\n' +
	t.repeat(2) + '},';
content = replaceOnce(content, c4_old, c4_new, 'CHANGE 4');

// ===== CHANGE 5 — _bindModalEvents: add move-to-category handler =====
// File indentation (verified):
//   3 tabs: // Transparencies toggle, var transChk, if (transChk) {, }
//   4 tabs: transChk.addEventListener, });
//   5 tabs: body vars inside addEventListener
//   2 tabs: },
var c5_old = t.repeat(3) + '// Transparencies toggle \u2014 live preview.\n' +
	t.repeat(3) + 'var transChk = modal.querySelector(\'.eff-gen-trans-toggle\');\n' +
	t.repeat(3) + 'if (transChk) {\n' +
	t.repeat(4) + 'transChk.addEventListener(\'change\', function () {\n' +
	t.repeat(5) + 'var isOn    = transChk.checked;\n' +
	t.repeat(5) + 'var palette = modal.querySelector(\'.eff-trans-palette\');\n' +
	t.repeat(5) + 'var vv      = self._findVarByKey(varId);\n' +
	t.repeat(5) + 'var rgba2   = vv ? self._parseToRgba(vv.value || \'\') : null;\n' +
	t.repeat(5) + 'if (palette) { palette.innerHTML = isOn ? self._buildTransBars(rgba2) : \'\'; }\n' +
	t.repeat(5) + 'if (vv) { self._debounceGenerate(varId, modal); }\n' +
	t.repeat(4) + '});\n' +
	t.repeat(3) + '}\n' +
	t.repeat(2) + '},';
var c5_new = t.repeat(3) + '// Transparencies toggle \u2014 live preview.\n' +
	t.repeat(3) + 'var transChk = modal.querySelector(\'.eff-gen-trans-toggle\');\n' +
	t.repeat(3) + 'if (transChk) {\n' +
	t.repeat(4) + 'transChk.addEventListener(\'change\', function () {\n' +
	t.repeat(5) + 'var isOn    = transChk.checked;\n' +
	t.repeat(5) + 'var palette = modal.querySelector(\'.eff-trans-palette\');\n' +
	t.repeat(5) + 'var vv      = self._findVarByKey(varId);\n' +
	t.repeat(5) + 'var rgba2   = vv ? self._parseToRgba(vv.value || \'\') : null;\n' +
	t.repeat(5) + 'if (palette) { palette.innerHTML = isOn ? self._buildTransBars(rgba2) : \'\'; }\n' +
	t.repeat(5) + 'if (vv) { self._debounceGenerate(varId, modal); }\n' +
	t.repeat(4) + '});\n' +
	t.repeat(3) + '}\n' +
	'\n' +
	t.repeat(3) + '// Move to category select.\n' +
	t.repeat(3) + 'var moveCatSel = modal.querySelector(\'.eff-cat-move-select\');\n' +
	t.repeat(3) + 'if (moveCatSel) {\n' +
	t.repeat(4) + 'moveCatSel.addEventListener(\'change\', function () {\n' +
	t.repeat(5) + 'var newCatId = moveCatSel.value;\n' +
	t.repeat(5) + 'if (newCatId) {\n' +
	t.repeat(6) + 'self._closeExpandPanel(container, false);\n' +
	t.repeat(6) + 'self._moveVarToCategory(varId, newCatId);\n' +
	t.repeat(5) + '}\n' +
	t.repeat(4) + '});\n' +
	t.repeat(3) + '}\n' +
	t.repeat(2) + '},';
content = replaceOnce(content, c5_old, c5_new, 'CHANGE 5');

// ===== CHANGE 6 — Insert _moveVarUp, _moveVarDown, _moveVarToCategory =====
// File indentation (verified):
//   2 tabs: // --- section header lines and // TINT/SHADE/TRANSPARENCY GENERATOR
var c6_old = t.repeat(2) + '// -----------------------------------------------------------------------\n' +
	t.repeat(2) + '// TINT/SHADE/TRANSPARENCY GENERATOR\n' +
	t.repeat(2) + '// -----------------------------------------------------------------------';

var moveUpMethod =
	t.repeat(2) + '/**\n' +
	t.repeat(2) + ' * Move a variable up within its category.\n' +
	t.repeat(2) + ' *\n' +
	t.repeat(2) + ' * @param {string}      varId     Row key.\n' +
	t.repeat(2) + ' * @param {string}      catId     Category ID.\n' +
	t.repeat(2) + ' * @param {HTMLElement} container Content container.\n' +
	t.repeat(2) + ' */\n' +
	t.repeat(2) + '_moveVarUp: function (varId, catId, container) {\n' +
	t.repeat(3) + 'var self = this;\n' +
	t.repeat(3) + 'var cats = (EFF.state.config && EFF.state.config.categories) || self._getDefaultCategories();\n' +
	t.repeat(3) + 'var cat  = null;\n' +
	t.repeat(3) + 'for (var ci = 0; ci < cats.length; ci++) {\n' +
	t.repeat(4) + 'if (cats[ci].id === catId) { cat = cats[ci]; break; }\n' +
	t.repeat(3) + '}\n' +
	t.repeat(3) + 'if (!cat) { return; }\n' +
	'\n' +
	t.repeat(3) + 'var vars = self._getVarsForCategory(cat); // sorted by order\n' +
	t.repeat(3) + 'var idx  = -1;\n' +
	t.repeat(3) + 'for (var i = 0; i < vars.length; i++) {\n' +
	t.repeat(4) + 'if (self._rowKey(vars[i]) === varId) { idx = i; break; }\n' +
	t.repeat(3) + '}\n' +
	t.repeat(3) + 'if (idx <= 0) { return; }\n' +
	'\n' +
	t.repeat(3) + 'var above   = vars[idx - 1];\n' +
	t.repeat(3) + 'var current = vars[idx];\n' +
	t.repeat(3) + 'var aOrd    = (above.order !== undefined && above.order !== null)   ? above.order   : (idx - 1);\n' +
	t.repeat(3) + 'var cOrd    = (current.order !== undefined && current.order !== null) ? current.order : idx;\n' +
	t.repeat(3) + '// If orders are equal, assign positional values.\n' +
	t.repeat(3) + 'if (aOrd === cOrd) { aOrd = idx - 1; cOrd = idx; }\n' +
	'\n' +
	t.repeat(3) + 'above.order   = cOrd;\n' +
	t.repeat(3) + 'current.order = aOrd;\n' +
	'\n' +
	t.repeat(3) + 'self._rerenderView();\n' +
	'\n' +
	t.repeat(3) + 'if (!EFF.state.currentFile || !above.id || !current.id) { return; }\n' +
	t.repeat(3) + 'if (EFF.App) { EFF.App.setDirty(true); }\n' +
	'\n' +
	t.repeat(3) + 'var p1 = EFF.App.ajax(\'eff_save_color\', {\n' +
	t.repeat(4) + 'filename: EFF.state.currentFile,\n' +
	t.repeat(4) + 'variable: JSON.stringify({ id: above.id,   order: above.order }),\n' +
	t.repeat(3) + '});\n' +
	t.repeat(3) + 'var p2 = EFF.App.ajax(\'eff_save_color\', {\n' +
	t.repeat(4) + 'filename: EFF.state.currentFile,\n' +
	t.repeat(4) + 'variable: JSON.stringify({ id: current.id, order: current.order }),\n' +
	t.repeat(3) + '});\n' +
	t.repeat(3) + 'Promise.all([p1, p2]).then(function (results) {\n' +
	t.repeat(4) + 'var last = results[results.length - 1];\n' +
	t.repeat(4) + 'if (last && last.success && last.data && last.data.data) {\n' +
	t.repeat(5) + 'EFF.state.variables = last.data.data.variables;\n' +
	t.repeat(4) + '}\n' +
	t.repeat(3) + '}).catch(function () {});\n' +
	t.repeat(2) + '},\n';

var moveDownMethod =
	t.repeat(2) + '/**\n' +
	t.repeat(2) + ' * Move a variable down within its category.\n' +
	t.repeat(2) + ' *\n' +
	t.repeat(2) + ' * @param {string}      varId     Row key.\n' +
	t.repeat(2) + ' * @param {string}      catId     Category ID.\n' +
	t.repeat(2) + ' * @param {HTMLElement} container Content container.\n' +
	t.repeat(2) + ' */\n' +
	t.repeat(2) + '_moveVarDown: function (varId, catId, container) {\n' +
	t.repeat(3) + 'var self = this;\n' +
	t.repeat(3) + 'var cats = (EFF.state.config && EFF.state.config.categories) || self._getDefaultCategories();\n' +
	t.repeat(3) + 'var cat  = null;\n' +
	t.repeat(3) + 'for (var ci = 0; ci < cats.length; ci++) {\n' +
	t.repeat(4) + 'if (cats[ci].id === catId) { cat = cats[ci]; break; }\n' +
	t.repeat(3) + '}\n' +
	t.repeat(3) + 'if (!cat) { return; }\n' +
	'\n' +
	t.repeat(3) + 'var vars = self._getVarsForCategory(cat); // sorted by order\n' +
	t.repeat(3) + 'var idx  = -1;\n' +
	t.repeat(3) + 'for (var i = 0; i < vars.length; i++) {\n' +
	t.repeat(4) + 'if (self._rowKey(vars[i]) === varId) { idx = i; break; }\n' +
	t.repeat(3) + '}\n' +
	t.repeat(3) + 'if (idx < 0 || idx >= vars.length - 1) { return; }\n' +
	'\n' +
	t.repeat(3) + 'var below   = vars[idx + 1];\n' +
	t.repeat(3) + 'var current = vars[idx];\n' +
	t.repeat(3) + 'var bOrd    = (below.order !== undefined && below.order !== null)     ? below.order   : (idx + 1);\n' +
	t.repeat(3) + 'var cOrd    = (current.order !== undefined && current.order !== null) ? current.order : idx;\n' +
	t.repeat(3) + 'if (bOrd === cOrd) { bOrd = idx + 1; cOrd = idx; }\n' +
	'\n' +
	t.repeat(3) + 'below.order   = cOrd;\n' +
	t.repeat(3) + 'current.order = bOrd;\n' +
	'\n' +
	t.repeat(3) + 'self._rerenderView();\n' +
	'\n' +
	t.repeat(3) + 'if (!EFF.state.currentFile || !below.id || !current.id) { return; }\n' +
	t.repeat(3) + 'if (EFF.App) { EFF.App.setDirty(true); }\n' +
	'\n' +
	t.repeat(3) + 'var p1 = EFF.App.ajax(\'eff_save_color\', {\n' +
	t.repeat(4) + 'filename: EFF.state.currentFile,\n' +
	t.repeat(4) + 'variable: JSON.stringify({ id: below.id,   order: below.order }),\n' +
	t.repeat(3) + '});\n' +
	t.repeat(3) + 'var p2 = EFF.App.ajax(\'eff_save_color\', {\n' +
	t.repeat(4) + 'filename: EFF.state.currentFile,\n' +
	t.repeat(4) + 'variable: JSON.stringify({ id: current.id, order: current.order }),\n' +
	t.repeat(3) + '});\n' +
	t.repeat(3) + 'Promise.all([p1, p2]).then(function (results) {\n' +
	t.repeat(4) + 'var last = results[results.length - 1];\n' +
	t.repeat(4) + 'if (last && last.success && last.data && last.data.data) {\n' +
	t.repeat(5) + 'EFF.state.variables = last.data.data.variables;\n' +
	t.repeat(4) + '}\n' +
	t.repeat(3) + '}).catch(function () {});\n' +
	t.repeat(2) + '},\n';

var moveToCatMethod =
	t.repeat(2) + '/**\n' +
	t.repeat(2) + ' * Move a variable to a different category.\n' +
	t.repeat(2) + ' *\n' +
	t.repeat(2) + ' * @param {string} varId    Row key.\n' +
	t.repeat(2) + ' * @param {string} newCatId Target category ID.\n' +
	t.repeat(2) + ' */\n' +
	t.repeat(2) + '_moveVarToCategory: function (varId, newCatId) {\n' +
	t.repeat(3) + 'var self = this;\n' +
	t.repeat(3) + 'var v    = self._findVarByKey(varId);\n' +
	t.repeat(3) + 'if (!v || !newCatId || newCatId === v.category_id) { return; }\n' +
	'\n' +
	t.repeat(3) + 'var cats   = (EFF.state.config && EFF.state.config.categories) || [];\n' +
	t.repeat(3) + 'var newCat = null;\n' +
	t.repeat(3) + 'for (var i = 0; i < cats.length; i++) {\n' +
	t.repeat(4) + 'if (cats[i].id === newCatId) { newCat = cats[i]; break; }\n' +
	t.repeat(3) + '}\n' +
	t.repeat(3) + 'if (!newCat) { return; }\n' +
	'\n' +
	t.repeat(3) + 'v.category_id = newCatId;\n' +
	t.repeat(3) + 'v.category    = newCat.name;\n' +
	t.repeat(3) + 'v.status      = \'modified\';\n' +
	'\n' +
	t.repeat(3) + 'self._rerenderView();\n' +
	'\n' +
	t.repeat(3) + 'if (!EFF.state.currentFile) { return; }\n' +
	t.repeat(3) + 'if (EFF.App) { EFF.App.setDirty(true); EFF.App.setPendingCommit(true); }\n' +
	'\n' +
	t.repeat(3) + 'EFF.App.ajax(\'eff_save_color\', {\n' +
	t.repeat(4) + 'filename: EFF.state.currentFile,\n' +
	t.repeat(4) + 'variable: JSON.stringify({ id: v.id, category_id: newCatId, category: newCat.name, status: \'modified\' }),\n' +
	t.repeat(3) + '}).then(function (res) {\n' +
	t.repeat(4) + 'if (res.success && res.data && res.data.data) {\n' +
	t.repeat(5) + 'EFF.state.variables = res.data.data.variables;\n' +
	t.repeat(4) + '}\n' +
	t.repeat(3) + '}).catch(function () {});\n' +
	t.repeat(2) + '},\n';

var c6_new =
	t.repeat(2) + '// -----------------------------------------------------------------------\n' +
	t.repeat(2) + '// MOVE VARIABLE\n' +
	t.repeat(2) + '// -----------------------------------------------------------------------\n' +
	'\n' +
	moveUpMethod + '\n' +
	moveDownMethod + '\n' +
	moveToCatMethod + '\n' +
	t.repeat(2) + '// -----------------------------------------------------------------------\n' +
	t.repeat(2) + '// TINT/SHADE/TRANSPARENCY GENERATOR\n' +
	t.repeat(2) + '// -----------------------------------------------------------------------';
content = replaceOnce(content, c6_old, c6_new, 'CHANGE 6');

// ===== CHANGE 7 — _saveVarName: add error display =====
// File indentation (verified):
//   3 tabs: if (!/^--...)
//   4 tabs: body lines
var c7_old = t.repeat(3) + 'if (!/^--[\\w-]+$/.test(newName)) {\n' +
	t.repeat(4) + 'nameInput.value = oldName; // Revert.\n' +
	t.repeat(4) + 'return;\n' +
	t.repeat(3) + '}';
var c7_new = t.repeat(3) + 'if (!/^--[\\w-]+$/.test(newName)) {\n' +
	t.repeat(4) + 'nameInput.value = oldName; // Revert.\n' +
	t.repeat(4) + 'self._showFieldError(nameInput, \'Name must start with -- and contain only letters, numbers, dashes, and underscores. Example: --my-color\');\n' +
	t.repeat(4) + 'return;\n' +
	t.repeat(3) + '}';
content = replaceOnce(content, c7_old, c7_new, 'CHANGE 7');

// ===== CHANGE 8 — container change handler for .eff-color-value-input =====
// File indentation (verified):
//   3 tabs: // ---- Value input, container.addEventListener, });
//   4 tabs: body lines inside handler
var c8_old = t.repeat(3) + '// ---- Value input: save on blur and Enter ----\n' +
	t.repeat(3) + 'container.addEventListener(\'change\', function (e) {\n' +
	t.repeat(4) + 'var valueInput = e.target.closest(\'.eff-color-value-input\');\n' +
	t.repeat(4) + 'if (!valueInput) { return; }\n' +
	t.repeat(4) + 'var row   = valueInput.closest(\'.eff-color-row\');\n' +
	t.repeat(4) + 'var varId = row ? row.getAttribute(\'data-var-id\') : null;\n' +
	t.repeat(4) + 'if (varId !== null) { self._saveVarValue(varId, valueInput.value, valueInput); }\n' +
	t.repeat(3) + '});';
var c8_new = t.repeat(3) + '// ---- Value input: save on blur and Enter ----\n' +
	t.repeat(3) + 'container.addEventListener(\'change\', function (e) {\n' +
	t.repeat(4) + 'var valueInput = e.target.closest(\'.eff-color-value-input\');\n' +
	t.repeat(4) + 'if (!valueInput) { return; }\n' +
	t.repeat(4) + 'var row   = valueInput.closest(\'.eff-color-row\');\n' +
	t.repeat(4) + 'var varId = row ? row.getAttribute(\'data-var-id\') : null;\n' +
	t.repeat(4) + 'if (varId === null) { return; }\n' +
	t.repeat(4) + 'var vv  = self._findVarByKey(varId);\n' +
	t.repeat(4) + 'var fmt = vv ? (vv.format || \'HEX\') : \'HEX\';\n' +
	t.repeat(4) + 'var res = self._normalizeColorValue(valueInput.value, fmt);\n' +
	t.repeat(4) + 'if (res.error) {\n' +
	t.repeat(5) + 'self._showFieldError(valueInput, res.error);\n' +
	t.repeat(5) + 'valueInput.value = valueInput.getAttribute(\'data-original\') || \'\';\n' +
	t.repeat(5) + 'return;\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'self._clearFieldError(valueInput);\n' +
	t.repeat(4) + 'if (res.value !== valueInput.value) { valueInput.value = res.value; }\n' +
	t.repeat(4) + 'self._saveVarValue(varId, res.value, valueInput);\n' +
	t.repeat(3) + '});';
content = replaceOnce(content, c8_old, c8_new, 'CHANGE 8');

// ===== CHANGE 9 — _bindModalEvents: update modal value input change handler =====
// File indentation (verified):
//   4 tabs: valueInput.addEventListener, });
//   5 tabs: body lines inside handler
var c9_old = t.repeat(4) + 'valueInput.addEventListener(\'change\', function () {\n' +
	t.repeat(5) + 'self._saveVarValue(varId, valueInput.value, valueInput);\n' +
	t.repeat(5) + 'var swatch = modal.querySelector(\'.eff-color-swatch\');\n' +
	t.repeat(5) + 'if (swatch) { swatch.style.background = valueInput.value; }\n' +
	t.repeat(4) + '});';
var c9_new = t.repeat(4) + 'valueInput.addEventListener(\'change\', function () {\n' +
	t.repeat(5) + 'var vv  = self._findVarByKey(varId);\n' +
	t.repeat(5) + 'var fmt = vv ? (vv.format || \'HEX\') : \'HEX\';\n' +
	t.repeat(5) + 'var res = self._normalizeColorValue(valueInput.value, fmt);\n' +
	t.repeat(5) + 'if (res.error) {\n' +
	t.repeat(6) + 'self._showFieldError(valueInput, res.error);\n' +
	t.repeat(6) + 'valueInput.value = valueInput.getAttribute(\'data-original\') || \'\';\n' +
	t.repeat(6) + 'return;\n' +
	t.repeat(5) + '}\n' +
	t.repeat(5) + 'self._clearFieldError(valueInput);\n' +
	t.repeat(5) + 'if (res.value !== valueInput.value) { valueInput.value = res.value; }\n' +
	t.repeat(5) + 'self._saveVarValue(varId, res.value, valueInput);\n' +
	t.repeat(5) + 'var swatch = modal.querySelector(\'.eff-color-swatch\');\n' +
	t.repeat(5) + 'if (swatch) { swatch.style.background = res.value; }\n' +
	t.repeat(4) + '});';
content = replaceOnce(content, c9_old, c9_new, 'CHANGE 9');

// ===== CHANGE 10 — Insert validation methods before MODAL HELPERS =====
// File indentation (verified):
//   2 tabs: // --- section header and // MODAL HELPERS
var c10_old = t.repeat(2) + '// -----------------------------------------------------------------------\n' +
	t.repeat(2) + '// MODAL HELPERS\n' +
	t.repeat(2) + '// -----------------------------------------------------------------------';

var normBody =
	t.repeat(3) + 'var v = (typeof raw === \'string\' ? raw : \'\').trim();\n' +
	'\n' +
	t.repeat(3) + '// ---- HEX / HEXA ----\n' +
	t.repeat(3) + 'if (format === \'HEX\' || format === \'HEXA\') {\n' +
	t.repeat(4) + 'var bare = v.replace(/^#/, \'\').toUpperCase();\n' +
	t.repeat(4) + '// Expand 3-char shorthand: FFF \u2192 FFFFFF\n' +
	t.repeat(4) + 'if (/^[0-9A-F]{3}$/.test(bare)) {\n' +
	t.repeat(5) + 'bare = bare[0]+bare[0] + bare[1]+bare[1] + bare[2]+bare[2];\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'if (format === \'HEX\') {\n' +
	t.repeat(5) + 'if (!/^[0-9A-F]{6}$/.test(bare)) {\n' +
	t.repeat(6) + 'return { value: v, error: \'HEX color must be 3 or 6 hex digits (0\u20139, A\u2013F). Example: #FF5733 or #F53\' };\n' +
	t.repeat(5) + '}\n' +
	t.repeat(5) + 'return { value: \'#\' + bare, error: null };\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + '// HEXA: accept 6 (append FF) or 8 digits.\n' +
	t.repeat(4) + 'if (/^[0-9A-F]{6}$/.test(bare)) { bare += \'FF\'; }\n' +
	t.repeat(4) + 'if (!/^[0-9A-F]{8}$/.test(bare)) {\n' +
	t.repeat(5) + 'return { value: v, error: \'HEXA color must be 6 or 8 hex digits. Example: #FF5733CC\' };\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'return { value: \'#\' + bare, error: null };\n' +
	t.repeat(3) + '}\n' +
	'\n' +
	t.repeat(3) + '// ---- RGB / RGBA ----\n' +
	t.repeat(3) + 'if (format === \'RGB\' || format === \'RGBA\') {\n' +
	t.repeat(4) + 'var inner = v.replace(/^rgba?\\s*\\(/i, \'\').replace(/\\)\\s*$/, \'\').trim();\n' +
	t.repeat(4) + 'var parts = inner.split(/[\\s,]+/).filter(function (s) { return s !== \'\'; });\n' +
	t.repeat(4) + 'var need  = (format === \'RGBA\') ? 4 : 3;\n' +
	t.repeat(4) + 'if (parts.length < need) {\n' +
	t.repeat(5) + 'return { value: v, error: format + \' requires \' + need + \' values separated by commas. Example: \' + (format === \'RGB\' ? \'rgb(255, 87, 51)\' : \'rgba(255, 87, 51, 0.8)\') };\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'var r = parseInt(parts[0], 10);\n' +
	t.repeat(4) + 'var g = parseInt(parts[1], 10);\n' +
	t.repeat(4) + 'var b = parseInt(parts[2], 10);\n' +
	t.repeat(4) + 'if (isNaN(r) || isNaN(g) || isNaN(b)) {\n' +
	t.repeat(5) + 'return { value: v, error: \'RGB channel values must be whole numbers (0\u2013255)\' };\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'r = Math.max(0, Math.min(255, r));\n' +
	t.repeat(4) + 'g = Math.max(0, Math.min(255, g));\n' +
	t.repeat(4) + 'b = Math.max(0, Math.min(255, b));\n' +
	t.repeat(4) + 'if (format === \'RGB\') {\n' +
	t.repeat(5) + 'return { value: \'rgb(\' + r + \', \' + g + \', \' + b + \')\', error: null };\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'var a = parseFloat(parts[3]);\n' +
	t.repeat(4) + 'if (isNaN(a)) {\n' +
	t.repeat(5) + 'return { value: v, error: \'RGBA alpha must be a decimal number (0\u20131). Example: 0.5\' };\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'a = Math.round(Math.max(0, Math.min(1, a)) * 100) / 100;\n' +
	t.repeat(4) + 'return { value: \'rgba(\' + r + \', \' + g + \', \' + b + \', \' + a + \')\', error: null };\n' +
	t.repeat(3) + '}\n' +
	'\n' +
	t.repeat(3) + '// ---- HSL / HSLA ----\n' +
	t.repeat(3) + 'if (format === \'HSL\' || format === \'HSLA\') {\n' +
	t.repeat(4) + 'var inner2 = v.replace(/^hsla?\\s*\\(/i, \'\').replace(/\\)\\s*$/, \'\').trim();\n' +
	t.repeat(4) + 'var raw2   = inner2.replace(/%/g, \'\');\n' +
	t.repeat(4) + 'var pts    = raw2.split(/[\\s,]+/).filter(function (s) { return s !== \'\'; });\n' +
	t.repeat(4) + 'var need2  = (format === \'HSLA\') ? 4 : 3;\n' +
	t.repeat(4) + 'if (pts.length < need2) {\n' +
	t.repeat(5) + 'return { value: v, error: format + \' requires \' + need2 + \' values. Example: \' + (format === \'HSL\' ? \'hsl(200, 60%, 40%)\' : \'hsla(200, 60%, 40%, 0.8)\') };\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'var h = parseFloat(pts[0]);\n' +
	t.repeat(4) + 'var s = parseFloat(pts[1]);\n' +
	t.repeat(4) + 'var l = parseFloat(pts[2]);\n' +
	t.repeat(4) + 'if (isNaN(h) || isNaN(s) || isNaN(l)) {\n' +
	t.repeat(5) + 'return { value: v, error: \'HSL values must be numbers: hue (0\u2013360), saturation (0\u2013100), lightness (0\u2013100)\' };\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'h = Math.round(((h % 360) + 360) % 360);\n' +
	t.repeat(4) + 's = Math.round(Math.max(0, Math.min(100, s)));\n' +
	t.repeat(4) + 'l = Math.round(Math.max(0, Math.min(100, l)));\n' +
	t.repeat(4) + 'if (format === \'HSL\') {\n' +
	t.repeat(5) + 'return { value: \'hsl(\' + h + \', \' + s + \'%, \' + l + \'%)\', error: null };\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'var a2 = parseFloat(pts[3]);\n' +
	t.repeat(4) + 'if (isNaN(a2)) {\n' +
	t.repeat(5) + 'return { value: v, error: \'HSLA alpha must be a decimal number (0\u20131). Example: 0.5\' };\n' +
	t.repeat(4) + '}\n' +
	t.repeat(4) + 'a2 = Math.round(Math.max(0, Math.min(1, a2)) * 100) / 100;\n' +
	t.repeat(4) + 'return { value: \'hsla(\' + h + \', \' + s + \'%, \' + l + \'%, \' + a2 + \')\', error: null };\n' +
	t.repeat(3) + '}\n' +
	'\n' +
	t.repeat(3) + 'return { value: v, error: null };\n';

var showBody =
	t.repeat(3) + 'this._clearFieldError(input);\n' +
	t.repeat(3) + 'var el  = document.createElement(\'div\');\n' +
	t.repeat(3) + 'el.className = \'eff-inline-error\';\n' +
	t.repeat(3) + 'el.textContent = message;\n' +
	t.repeat(3) + 'var rect   = input.getBoundingClientRect();\n' +
	t.repeat(3) + 'el.style.left = rect.left + \'px\';\n' +
	t.repeat(3) + 'el.style.top  = (rect.bottom + 4) + \'px\';\n' +
	t.repeat(3) + 'document.body.appendChild(el);\n' +
	t.repeat(3) + 'input._effError = el;\n' +
	t.repeat(3) + 'var timer = setTimeout(function () {\n' +
	t.repeat(4) + 'if (el.parentNode) { el.parentNode.removeChild(el); }\n' +
	t.repeat(4) + 'if (input._effError === el) { input._effError = null; }\n' +
	t.repeat(3) + '}, 3500);\n' +
	t.repeat(3) + 'input._effErrorTimer = timer;\n';

var clearBody =
	t.repeat(3) + 'if (input._effError) {\n' +
	t.repeat(4) + 'if (input._effError.parentNode) { input._effError.parentNode.removeChild(input._effError); }\n' +
	t.repeat(4) + 'input._effError = null;\n' +
	t.repeat(3) + '}\n' +
	t.repeat(3) + 'if (input._effErrorTimer) {\n' +
	t.repeat(4) + 'clearTimeout(input._effErrorTimer);\n' +
	t.repeat(4) + 'input._effErrorTimer = null;\n' +
	t.repeat(3) + '}\n';

var c10_new =
	t.repeat(2) + '// -----------------------------------------------------------------------\n' +
	t.repeat(2) + '// FIELD VALIDATION + ERROR DISPLAY\n' +
	t.repeat(2) + '// -----------------------------------------------------------------------\n' +
	'\n' +
	t.repeat(2) + '/**\n' +
	t.repeat(2) + ' * Normalize and validate a user-entered color value for the given format.\n' +
	t.repeat(2) + ' * Auto-corrects common mistakes; returns error string for fatal failures.\n' +
	t.repeat(2) + ' *\n' +
	t.repeat(2) + ' * @param {string} raw    Raw user input.\n' +
	t.repeat(2) + ' * @param {string} format HEX | HEXA | RGB | RGBA | HSL | HSLA\n' +
	t.repeat(2) + ' * @returns {{ value: string, error: string|null }}\n' +
	t.repeat(2) + ' */\n' +
	t.repeat(2) + '_normalizeColorValue: function (raw, format) {\n' +
	normBody +
	t.repeat(2) + '},\n' +
	'\n' +
	t.repeat(2) + '/**\n' +
	t.repeat(2) + ' * Show a floating inline error tooltip below an input element.\n' +
	t.repeat(2) + ' * Auto-dismisses after 3.5 seconds.\n' +
	t.repeat(2) + ' *\n' +
	t.repeat(2) + ' * @param {HTMLElement} input   The input with the invalid value.\n' +
	t.repeat(2) + ' * @param {string}      message Error message to display.\n' +
	t.repeat(2) + ' */\n' +
	t.repeat(2) + '_showFieldError: function (input, message) {\n' +
	showBody +
	t.repeat(2) + '},\n' +
	'\n' +
	t.repeat(2) + '/**\n' +
	t.repeat(2) + ' * Remove any visible field error tooltip for an input.\n' +
	t.repeat(2) + ' *\n' +
	t.repeat(2) + ' * @param {HTMLElement} input\n' +
	t.repeat(2) + ' */\n' +
	t.repeat(2) + '_clearFieldError: function (input) {\n' +
	clearBody +
	t.repeat(2) + '},\n' +
	'\n' +
	t.repeat(2) + '// -----------------------------------------------------------------------\n' +
	t.repeat(2) + '// MODAL HELPERS\n' +
	t.repeat(2) + '// -----------------------------------------------------------------------';
content = replaceOnce(content, c10_old, c10_new, 'CHANGE 10');

// ===== Write result =====
if (content === original) {
	log.push('WARNING: No changes were made to content.');
} else {
	// Restore CRLF if original had it
	var finalContent = hasCRLF ? content.replace(/\n/g, '\r\n') : content;
	fs.writeFileSync(path, finalContent, 'utf8');
	log.push('File written successfully.');
}

// Write log
fs.writeFileSync('E:/projects/plugins/eff/apply_result.txt', log.join('\n') + '\n', 'utf8');
