#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Apply 10 changes to eff-colors.js
File uses: LF line endings, tabs for indentation.
"""

import sys

path = 'E:/projects/plugins/eff/admin/js/eff-colors.js'

with open(path, 'r', encoding='utf-8', newline='') as f:
    content = f.read()

original = content

def replace_once(content, old, new, label):
    count = content.count(old)
    if count == 0:
        print(f'ERROR: {label} — old string NOT FOUND')
        # Show context for debugging
        # Find partial match
        lines_old = old.split('\n')
        first_line = lines_old[0]
        idx = content.find(first_line)
        if idx >= 0:
            print(f'  First line found at index {idx}, showing context:')
            print(repr(content[idx:idx+200]))
        else:
            print(f'  First line not found either: {repr(first_line[:60])}')
        sys.exit(1)
    if count > 1:
        print(f'WARNING: {label} — found {count} occurrences, replacing first only')
        return content.replace(old, new, 1)
    print(f'OK: {label}')
    return content.replace(old, new, 1)

t = '\t'

# ===========================================================================
# CHANGE 1 — _buildVariableRow: add move buttons
# (Inside _buildVariableRow, 3-tab indent for continuation lines)
# ===========================================================================

old1 = (
    t*3 + '// Format selector.\n' +
    t*3 + '+ \'<select class="eff-color-format-sel" aria-label="Color format"\'\n' +
    t*3 + '+ \' data-eff-tooltip="Color format">\'\n' +
    t*3 + '+ this._formatOptions(v.format || \'HEX\')\n' +
    t*3 + '+ \'</select>\'\n' +
    '\n' +
    t*3 + '// Expand button.\n' +
    t*3 + '+ \'<button class="eff-icon-btn eff-color-expand-btn"\'\n' +
    t*3 + '+ \' data-action="expand"\'\n' +
    t*3 + '+ \' aria-label="Open color editor"\'\n' +
    t*3 + '+ \' aria-expanded="false"\'\n' +
    t*3 + '+ \' data-eff-tooltip="Open color editor">\'\n' +
    t*3 + '+ this._chevronSVG()\n' +
    t*3 + '+ \'</button>\'\n' +
    '\n' +
    t*3 + '+ \'</div>\'; // .eff-color-row'
)

new1 = (
    t*3 + '// Format selector.\n' +
    t*3 + '+ \'<select class="eff-color-format-sel" aria-label="Color format"\'\n' +
    t*3 + '+ \' data-eff-tooltip="Color format">\'\n' +
    t*3 + '+ this._formatOptions(v.format || \'HEX\')\n' +
    t*3 + '+ \'</select>\'\n' +
    '\n' +
    t*3 + '// Move within category (col 6: 56px = two 28px buttons).\n' +
    t*3 + '+ \'<div class="eff-row-move-btns">\'\n' +
    t*3 + '+ \'<button class="eff-icon-btn" data-action="move-var-up"\'\n' +
    t*3 + '+ \' aria-label="Move variable up" title="Move up">\'\n' +
    t*3 + '+ this._arrowUpSVG()\n' +
    t*3 + '+ \'</button>\'\n' +
    t*3 + '+ \'<button class="eff-icon-btn" data-action="move-var-down"\'\n' +
    t*3 + '+ \' aria-label="Move variable down" title="Move down">\'\n' +
    t*3 + '+ this._arrowDownSVG()\n' +
    t*3 + '+ \'</button>\'\n' +
    t*3 + '+ \'</div>\'\n' +
    '\n' +
    t*3 + '// Expand button (col 7: 28px).\n' +
    t*3 + '+ \'<button class="eff-icon-btn eff-color-expand-btn"\'\n' +
    t*3 + '+ \' data-action="expand"\'\n' +
    t*3 + '+ \' aria-label="Open color editor"\'\n' +
    t*3 + '+ \' aria-expanded="false"\'\n' +
    t*3 + '+ \' data-eff-tooltip="Open color editor">\'\n' +
    t*3 + '+ this._chevronSVG()\n' +
    t*3 + '+ \'</button>\'\n' +
    '\n' +
    t*3 + '+ \'</div>\'; // .eff-color-row'
)

content = replace_once(content, old1, new1, 'CHANGE 1')

# ===========================================================================
# CHANGE 2 — _bindEvents: add move-var-up / move-var-down cases before 'expand'
# (4-tab indent for case labels, 5-tab for body)
# ===========================================================================

old2 = (
    t*4 + 'case \'expand\':\n' +
    t*5 + 'var row   = btn.closest(\'.eff-color-row\');\n' +
    t*5 + 'var varId = row ? row.getAttribute(\'data-var-id\') : null;\n' +
    t*5 + 'if (varId !== null) { self._toggleExpandPanel(varId, row, container); }\n' +
    t*5 + 'break;\n' +
    '\n' +
    t*4 + 'case \'open-picker\':\n' +
    t*5 + 'var swatchRow = target.closest(\'.eff-color-row\');\n' +
    t*5 + 'var swVarId   = swatchRow ? swatchRow.getAttribute(\'data-var-id\') : null;\n' +
    t*5 + 'if (swVarId !== null) { self._toggleExpandPanel(swVarId, swatchRow, container); }\n' +
    t*5 + 'break;'
)

new2 = (
    t*4 + 'case \'move-var-up\': {\n' +
    t*5 + 'var mvRow   = btn.closest(\'.eff-color-row\');\n' +
    t*5 + 'var mvVarId = mvRow ? mvRow.getAttribute(\'data-var-id\') : null;\n' +
    t*5 + 'if (mvVarId !== null && catId !== null) { self._moveVarUp(mvVarId, catId, container); }\n' +
    t*5 + 'break;\n' +
    t*4 + '}\n' +
    '\n' +
    t*4 + 'case \'move-var-down\': {\n' +
    t*5 + 'var mdRow   = btn.closest(\'.eff-color-row\');\n' +
    t*5 + 'var mdVarId = mdRow ? mdRow.getAttribute(\'data-var-id\') : null;\n' +
    t*5 + 'if (mdVarId !== null && catId !== null) { self._moveVarDown(mdVarId, catId, container); }\n' +
    t*5 + 'break;\n' +
    t*4 + '}\n' +
    '\n' +
    t*4 + 'case \'expand\':\n' +
    t*5 + 'var row   = btn.closest(\'.eff-color-row\');\n' +
    t*5 + 'var varId = row ? row.getAttribute(\'data-var-id\') : null;\n' +
    t*5 + 'if (varId !== null) { self._toggleExpandPanel(varId, row, container); }\n' +
    t*5 + 'break;\n' +
    '\n' +
    t*4 + 'case \'open-picker\':\n' +
    t*5 + 'var swatchRow = target.closest(\'.eff-color-row\');\n' +
    t*5 + 'var swVarId   = swatchRow ? swatchRow.getAttribute(\'data-var-id\') : null;\n' +
    t*5 + 'if (swVarId !== null) { self._toggleExpandPanel(swVarId, swatchRow, container); }\n' +
    t*5 + 'break;'
)

content = replace_once(content, old2, new2, 'CHANGE 2')

# ===========================================================================
# CHANGE 3a — standard filter: add .sort()
# (2-tab indent for method body inside _getVarsForCategory)
# ===========================================================================

old3a = (
    t*2 + '// Standard filter: match by category_id or category name.\n' +
    t*2 + 'return allVars.filter(function (v) {\n' +
    t*3 + 'return v.subgroup === \'Colors\'\n' +
    t*4 + '&& (v.category_id === cat.id || v.category === cat.name)\n' +
    t*4 + '&& v.status !== \'deleted\';\n' +
    t*2 + '});'
)

new3a = (
    t*2 + '// Standard filter: match by category_id or category name, sorted by order.\n' +
    t*2 + 'return allVars.filter(function (v) {\n' +
    t*3 + 'return v.subgroup === \'Colors\'\n' +
    t*4 + '&& (v.category_id === cat.id || v.category === cat.name)\n' +
    t*4 + '&& v.status !== \'deleted\';\n' +
    t*2 + '}).sort(function (a, b) {\n' +
    t*3 + 'return (a.order || 0) - (b.order || 0);\n' +
    t*2 + '});'
)

content = replace_once(content, old3a, new3a, 'CHANGE 3a')

# ===========================================================================
# CHANGE 3b — Uncategorized filter: add .sort()
# (3-tab indent — inside the if (cat.name === 'Uncategorized') block)
# ===========================================================================

old3b = (
    t*3 + 'return allVars.filter(function (v) {\n' +
    t*4 + 'if (v.subgroup !== \'Colors\' || v.status === \'deleted\') { return false; }\n' +
    t*4 + '// Explicitly assigned to this Uncategorized category.\n' +
    t*4 + 'if (v.category_id === cat.id || v.category === cat.name) { return true; }\n' +
    t*4 + '// Falls through \u2014 not matched by any other category.\n' +
    t*4 + 'var hasOtherCatId   = v.category_id && validIds[v.category_id];\n' +
    t*4 + 'var hasOtherCatName = v.category    && validNames[v.category];\n' +
    t*4 + 'return !hasOtherCatId && !hasOtherCatName;\n' +
    t*3 + '});'
)

new3b = (
    t*3 + 'return allVars.filter(function (v) {\n' +
    t*4 + 'if (v.subgroup !== \'Colors\' || v.status === \'deleted\') { return false; }\n' +
    t*4 + '// Explicitly assigned to this Uncategorized category.\n' +
    t*4 + 'if (v.category_id === cat.id || v.category === cat.name) { return true; }\n' +
    t*4 + '// Falls through \u2014 not matched by any other category.\n' +
    t*4 + 'var hasOtherCatId   = v.category_id && validIds[v.category_id];\n' +
    t*4 + 'var hasOtherCatName = v.category    && validNames[v.category];\n' +
    t*4 + 'return !hasOtherCatId && !hasOtherCatName;\n' +
    t*3 + '}).sort(function (a, b) {\n' +
    t*4 + 'return (a.order || 0) - (b.order || 0);\n' +
    t*3 + '});'
)

content = replace_once(content, old3b, new3b, 'CHANGE 3b')

# ===========================================================================
# CHANGE 4 — _buildModalContent: add Move to Category row
# (2-tab indent for _buildModalContent body)
# ===========================================================================

old4 = (
    t*2 + 'html += \'</div>\'; // .eff-modal-body\n' +
    t*2 + 'return html;\n' +
    t + '},'
)

new4 = (
    t*2 + '// Move to Category row.\n' +
    t*2 + 'var allCats = (EFF.state.config && EFF.state.config.categories) ? EFF.state.config.categories : [];\n' +
    t*2 + 'var currentCatId = v.category_id || \'\';\n' +
    t*2 + 'var catOptions = \'\';\n' +
    t*2 + 'for (var ci = 0; ci < allCats.length; ci++) {\n' +
    t*3 + 'var co = allCats[ci];\n' +
    t*3 + 'catOptions += \'<option value="\' + self._esc(co.id) + \'"\'\n' +
    t*4 + '+ (co.id === currentCatId ? \' selected\' : \'\') + \'>\'\n' +
    t*4 + '+ self._esc(co.name)\n' +
    t*4 + '+ \'</option>\';\n' +
    t*2 + '}\n' +
    '\n' +
    t*2 + 'if (allCats.length > 1) {\n' +
    t*3 + 'html += \'<div class="eff-modal-gen-row">\'\n' +
    t*4 + '+ \'<span class="eff-modal-gen-label">Move to Category</span>\'\n' +
    t*4 + '+ \'<div class="eff-modal-gen-ctrl" style="width:auto;flex:1">\'\n' +
    t*4 + '+ \'<select class="eff-cat-move-select" data-var-id="\' + self._esc(rowKey) + \'">\'\n' +
    t*4 + '+ catOptions\n' +
    t*4 + '+ \'</select>\'\n' +
    t*4 + '+ \'</div>\'\n' +
    t*4 + '+ \'</div>\';\n' +
    t*2 + '}\n' +
    '\n' +
    t*2 + 'html += \'</div>\'; // .eff-modal-body\n' +
    t*2 + 'return html;\n' +
    t + '},'
)

content = replace_once(content, old4, new4, 'CHANGE 4')

# ===========================================================================
# CHANGE 5 — _bindModalEvents: add move-to-category handler
# (2-tab indent for _bindModalEvents body, 3-tab for if blocks)
# ===========================================================================

old5 = (
    t*2 + '// Transparencies toggle \u2014 live preview.\n' +
    t*2 + 'var transChk = modal.querySelector(\'.eff-gen-trans-toggle\');\n' +
    t*2 + 'if (transChk) {\n' +
    t*3 + 'transChk.addEventListener(\'change\', function () {\n' +
    t*4 + 'var isOn    = transChk.checked;\n' +
    t*4 + 'var palette = modal.querySelector(\'.eff-trans-palette\');\n' +
    t*4 + 'var vv      = self._findVarByKey(varId);\n' +
    t*4 + 'var rgba2   = vv ? self._parseToRgba(vv.value || \'\') : null;\n' +
    t*4 + 'if (palette) { palette.innerHTML = isOn ? self._buildTransBars(rgba2) : \'\'; }\n' +
    t*4 + 'if (vv) { self._debounceGenerate(varId, modal); }\n' +
    t*3 + '});\n' +
    t*2 + '}\n' +
    t + '},'
)

new5 = (
    t*2 + '// Transparencies toggle \u2014 live preview.\n' +
    t*2 + 'var transChk = modal.querySelector(\'.eff-gen-trans-toggle\');\n' +
    t*2 + 'if (transChk) {\n' +
    t*3 + 'transChk.addEventListener(\'change\', function () {\n' +
    t*4 + 'var isOn    = transChk.checked;\n' +
    t*4 + 'var palette = modal.querySelector(\'.eff-trans-palette\');\n' +
    t*4 + 'var vv      = self._findVarByKey(varId);\n' +
    t*4 + 'var rgba2   = vv ? self._parseToRgba(vv.value || \'\') : null;\n' +
    t*4 + 'if (palette) { palette.innerHTML = isOn ? self._buildTransBars(rgba2) : \'\'; }\n' +
    t*4 + 'if (vv) { self._debounceGenerate(varId, modal); }\n' +
    t*3 + '});\n' +
    t*2 + '}\n' +
    '\n' +
    t*2 + '// Move to category select.\n' +
    t*2 + 'var moveCatSel = modal.querySelector(\'.eff-cat-move-select\');\n' +
    t*2 + 'if (moveCatSel) {\n' +
    t*3 + 'moveCatSel.addEventListener(\'change\', function () {\n' +
    t*4 + 'var newCatId = moveCatSel.value;\n' +
    t*4 + 'if (newCatId) {\n' +
    t*5 + 'self._closeExpandPanel(container, false);\n' +
    t*5 + 'self._moveVarToCategory(varId, newCatId);\n' +
    t*4 + '}\n' +
    t*3 + '});\n' +
    t*2 + '}\n' +
    t + '},'
)

content = replace_once(content, old5, new5, 'CHANGE 5')

# ===========================================================================
# CHANGE 6 — Insert _moveVarUp, _moveVarDown, _moveVarToCategory before
#             "TINT/SHADE/TRANSPARENCY GENERATOR" comment
# (1-tab indent for section comment block, 2-tab for method body)
# ===========================================================================

old6 = (
    t + '// -----------------------------------------------------------------------\n' +
    t + '// TINT/SHADE/TRANSPARENCY GENERATOR\n' +
    t + '// -----------------------------------------------------------------------'
)

new6 = (
    t + '// -----------------------------------------------------------------------\n' +
    t + '// MOVE VARIABLE\n' +
    t + '// -----------------------------------------------------------------------\n' +
    '\n' +
    t + '/**\n' +
    t + ' * Move a variable up within its category.\n' +
    t + ' *\n' +
    t + ' * @param {string}      varId     Row key.\n' +
    t + ' * @param {string}      catId     Category ID.\n' +
    t + ' * @param {HTMLElement} container Content container.\n' +
    t + ' */\n' +
    t + '_moveVarUp: function (varId, catId, container) {\n' +
    t*2 + 'var self = this;\n' +
    t*2 + 'var cats = (EFF.state.config && EFF.state.config.categories) || self._getDefaultCategories();\n' +
    t*2 + 'var cat  = null;\n' +
    t*2 + 'for (var ci = 0; ci < cats.length; ci++) {\n' +
    t*3 + 'if (cats[ci].id === catId) { cat = cats[ci]; break; }\n' +
    t*2 + '}\n' +
    t*2 + 'if (!cat) { return; }\n' +
    '\n' +
    t*2 + 'var vars = self._getVarsForCategory(cat); // sorted by order\n' +
    t*2 + 'var idx  = -1;\n' +
    t*2 + 'for (var i = 0; i < vars.length; i++) {\n' +
    t*3 + 'if (self._rowKey(vars[i]) === varId) { idx = i; break; }\n' +
    t*2 + '}\n' +
    t*2 + 'if (idx <= 0) { return; }\n' +
    '\n' +
    t*2 + 'var above   = vars[idx - 1];\n' +
    t*2 + 'var current = vars[idx];\n' +
    t*2 + 'var aOrd    = (above.order !== undefined && above.order !== null)   ? above.order   : (idx - 1);\n' +
    t*2 + 'var cOrd    = (current.order !== undefined && current.order !== null) ? current.order : idx;\n' +
    t*2 + '// If orders are equal, assign positional values.\n' +
    t*2 + 'if (aOrd === cOrd) { aOrd = idx - 1; cOrd = idx; }\n' +
    '\n' +
    t*2 + 'above.order   = cOrd;\n' +
    t*2 + 'current.order = aOrd;\n' +
    '\n' +
    t*2 + 'self._rerenderView();\n' +
    '\n' +
    t*2 + 'if (!EFF.state.currentFile || !above.id || !current.id) { return; }\n' +
    t*2 + 'if (EFF.App) { EFF.App.setDirty(true); }\n' +
    '\n' +
    t*2 + 'var p1 = EFF.App.ajax(\'eff_save_color\', {\n' +
    t*3 + 'filename: EFF.state.currentFile,\n' +
    t*3 + 'variable: JSON.stringify({ id: above.id,   order: above.order }),\n' +
    t*2 + '});\n' +
    t*2 + 'var p2 = EFF.App.ajax(\'eff_save_color\', {\n' +
    t*3 + 'filename: EFF.state.currentFile,\n' +
    t*3 + 'variable: JSON.stringify({ id: current.id, order: current.order }),\n' +
    t*2 + '});\n' +
    t*2 + 'Promise.all([p1, p2]).then(function (results) {\n' +
    t*3 + 'var last = results[results.length - 1];\n' +
    t*3 + 'if (last && last.success && last.data && last.data.data) {\n' +
    t*4 + 'EFF.state.variables = last.data.data.variables;\n' +
    t*3 + '}\n' +
    t*2 + '}).catch(function () {});\n' +
    t + '},\n' +
    '\n' +
    t + '/**\n' +
    t + ' * Move a variable down within its category.\n' +
    t + ' *\n' +
    t + ' * @param {string}      varId     Row key.\n' +
    t + ' * @param {string}      catId     Category ID.\n' +
    t + ' * @param {HTMLElement} container Content container.\n' +
    t + ' */\n' +
    t + '_moveVarDown: function (varId, catId, container) {\n' +
    t*2 + 'var self = this;\n' +
    t*2 + 'var cats = (EFF.state.config && EFF.state.config.categories) || self._getDefaultCategories();\n' +
    t*2 + 'var cat  = null;\n' +
    t*2 + 'for (var ci = 0; ci < cats.length; ci++) {\n' +
    t*3 + 'if (cats[ci].id === catId) { cat = cats[ci]; break; }\n' +
    t*2 + '}\n' +
    t*2 + 'if (!cat) { return; }\n' +
    '\n' +
    t*2 + 'var vars = self._getVarsForCategory(cat); // sorted by order\n' +
    t*2 + 'var idx  = -1;\n' +
    t*2 + 'for (var i = 0; i < vars.length; i++) {\n' +
    t*3 + 'if (self._rowKey(vars[i]) === varId) { idx = i; break; }\n' +
    t*2 + '}\n' +
    t*2 + 'if (idx < 0 || idx >= vars.length - 1) { return; }\n' +
    '\n' +
    t*2 + 'var below   = vars[idx + 1];\n' +
    t*2 + 'var current = vars[idx];\n' +
    t*2 + 'var bOrd    = (below.order !== undefined && below.order !== null)     ? below.order   : (idx + 1);\n' +
    t*2 + 'var cOrd    = (current.order !== undefined && current.order !== null) ? current.order : idx;\n' +
    t*2 + 'if (bOrd === cOrd) { bOrd = idx + 1; cOrd = idx; }\n' +
    '\n' +
    t*2 + 'below.order   = cOrd;\n' +
    t*2 + 'current.order = bOrd;\n' +
    '\n' +
    t*2 + 'self._rerenderView();\n' +
    '\n' +
    t*2 + 'if (!EFF.state.currentFile || !below.id || !current.id) { return; }\n' +
    t*2 + 'if (EFF.App) { EFF.App.setDirty(true); }\n' +
    '\n' +
    t*2 + 'var p1 = EFF.App.ajax(\'eff_save_color\', {\n' +
    t*3 + 'filename: EFF.state.currentFile,\n' +
    t*3 + 'variable: JSON.stringify({ id: below.id,   order: below.order }),\n' +
    t*2 + '});\n' +
    t*2 + 'var p2 = EFF.App.ajax(\'eff_save_color\', {\n' +
    t*3 + 'filename: EFF.state.currentFile,\n' +
    t*3 + 'variable: JSON.stringify({ id: current.id, order: current.order }),\n' +
    t*2 + '});\n' +
    t*2 + 'Promise.all([p1, p2]).then(function (results) {\n' +
    t*3 + 'var last = results[results.length - 1];\n' +
    t*3 + 'if (last && last.success && last.data && last.data.data) {\n' +
    t*4 + 'EFF.state.variables = last.data.data.variables;\n' +
    t*3 + '}\n' +
    t*2 + '}).catch(function () {});\n' +
    t + '},\n' +
    '\n' +
    t + '/**\n' +
    t + ' * Move a variable to a different category.\n' +
    t + ' *\n' +
    t + ' * @param {string} varId    Row key.\n' +
    t + ' * @param {string} newCatId Target category ID.\n' +
    t + ' */\n' +
    t + '_moveVarToCategory: function (varId, newCatId) {\n' +
    t*2 + 'var self = this;\n' +
    t*2 + 'var v    = self._findVarByKey(varId);\n' +
    t*2 + 'if (!v || !newCatId || newCatId === v.category_id) { return; }\n' +
    '\n' +
    t*2 + 'var cats   = (EFF.state.config && EFF.state.config.categories) || [];\n' +
    t*2 + 'var newCat = null;\n' +
    t*2 + 'for (var i = 0; i < cats.length; i++) {\n' +
    t*3 + 'if (cats[i].id === newCatId) { newCat = cats[i]; break; }\n' +
    t*2 + '}\n' +
    t*2 + 'if (!newCat) { return; }\n' +
    '\n' +
    t*2 + 'v.category_id = newCatId;\n' +
    t*2 + 'v.category    = newCat.name;\n' +
    t*2 + 'v.status      = \'modified\';\n' +
    '\n' +
    t*2 + 'self._rerenderView();\n' +
    '\n' +
    t*2 + 'if (!EFF.state.currentFile) { return; }\n' +
    t*2 + 'if (EFF.App) { EFF.App.setDirty(true); EFF.App.setPendingCommit(true); }\n' +
    '\n' +
    t*2 + 'EFF.App.ajax(\'eff_save_color\', {\n' +
    t*3 + 'filename: EFF.state.currentFile,\n' +
    t*3 + 'variable: JSON.stringify({ id: v.id, category_id: newCatId, category: newCat.name, status: \'modified\' }),\n' +
    t*2 + '}).then(function (res) {\n' +
    t*3 + 'if (res.success && res.data && res.data.data) {\n' +
    t*4 + 'EFF.state.variables = res.data.data.variables;\n' +
    t*3 + '}\n' +
    t*2 + '}).catch(function () {});\n' +
    t + '},\n' +
    '\n' +
    t + '// -----------------------------------------------------------------------\n' +
    t + '// TINT/SHADE/TRANSPARENCY GENERATOR\n' +
    t + '// -----------------------------------------------------------------------'
)

content = replace_once(content, old6, new6, 'CHANGE 6')

# ===========================================================================
# CHANGE 7 — _saveVarName: add error display for invalid name
# (2-tab indent for the if body, 3-tab for inner statements)
# ===========================================================================

old7 = (
    t*2 + 'if (!/^--[\\w-]+$/.test(newName)) {\n' +
    t*3 + 'nameInput.value = oldName; // Revert.\n' +
    t*3 + 'return;\n' +
    t*2 + '}'
)

new7 = (
    t*2 + 'if (!/^--[\\w-]+$/.test(newName)) {\n' +
    t*3 + 'nameInput.value = oldName; // Revert.\n' +
    t*3 + "self._showFieldError(nameInput, 'Name must start with -- and contain only letters, numbers, dashes, and underscores. Example: --my-color');\n" +
    t*3 + 'return;\n' +
    t*2 + '}'
)

content = replace_once(content, old7, new7, 'CHANGE 7')

# ===========================================================================
# CHANGE 8 — container change handler for .eff-color-value-input
# (3-tab indent for the handler body, inside container.addEventListener)
# ===========================================================================

old8 = (
    t*2 + '// ---- Value input: save on blur and Enter ----\n' +
    t*2 + 'container.addEventListener(\'change\', function (e) {\n' +
    t*3 + 'var valueInput = e.target.closest(\'.eff-color-value-input\');\n' +
    t*3 + 'if (!valueInput) { return; }\n' +
    t*3 + 'var row   = valueInput.closest(\'.eff-color-row\');\n' +
    t*3 + 'var varId = row ? row.getAttribute(\'data-var-id\') : null;\n' +
    t*3 + 'if (varId !== null) { self._saveVarValue(varId, valueInput.value, valueInput); }\n' +
    t*2 + '});'
)

new8 = (
    t*2 + '// ---- Value input: save on blur and Enter ----\n' +
    t*2 + 'container.addEventListener(\'change\', function (e) {\n' +
    t*3 + 'var valueInput = e.target.closest(\'.eff-color-value-input\');\n' +
    t*3 + 'if (!valueInput) { return; }\n' +
    t*3 + 'var row   = valueInput.closest(\'.eff-color-row\');\n' +
    t*3 + 'var varId = row ? row.getAttribute(\'data-var-id\') : null;\n' +
    t*3 + 'if (varId === null) { return; }\n' +
    t*3 + 'var vv  = self._findVarByKey(varId);\n' +
    t*3 + 'var fmt = vv ? (vv.format || \'HEX\') : \'HEX\';\n' +
    t*3 + 'var res = self._normalizeColorValue(valueInput.value, fmt);\n' +
    t*3 + 'if (res.error) {\n' +
    t*4 + 'self._showFieldError(valueInput, res.error);\n' +
    t*4 + "valueInput.value = valueInput.getAttribute('data-original') || '';\n" +
    t*4 + 'return;\n' +
    t*3 + '}\n' +
    t*3 + 'self._clearFieldError(valueInput);\n' +
    t*3 + 'if (res.value !== valueInput.value) { valueInput.value = res.value; }\n' +
    t*3 + 'self._saveVarValue(varId, res.value, valueInput);\n' +
    t*2 + '});'
)

content = replace_once(content, old8, new8, 'CHANGE 8')

# ===========================================================================
# CHANGE 9 — _bindModalEvents: update modal value input change handler
# (3-tab indent inside valueInput.addEventListener, 4-tab for if body)
# ===========================================================================

old9 = (
    t*3 + 'valueInput.addEventListener(\'change\', function () {\n' +
    t*4 + 'self._saveVarValue(varId, valueInput.value, valueInput);\n' +
    t*4 + 'var swatch = modal.querySelector(\'.eff-color-swatch\');\n' +
    t*4 + 'if (swatch) { swatch.style.background = valueInput.value; }\n' +
    t*3 + '});'
)

new9 = (
    t*3 + 'valueInput.addEventListener(\'change\', function () {\n' +
    t*4 + 'var vv  = self._findVarByKey(varId);\n' +
    t*4 + 'var fmt = vv ? (vv.format || \'HEX\') : \'HEX\';\n' +
    t*4 + 'var res = self._normalizeColorValue(valueInput.value, fmt);\n' +
    t*4 + 'if (res.error) {\n' +
    t*5 + 'self._showFieldError(valueInput, res.error);\n' +
    t*5 + "valueInput.value = valueInput.getAttribute('data-original') || '';\n" +
    t*5 + 'return;\n' +
    t*4 + '}\n' +
    t*4 + 'self._clearFieldError(valueInput);\n' +
    t*4 + 'if (res.value !== valueInput.value) { valueInput.value = res.value; }\n' +
    t*4 + 'self._saveVarValue(varId, res.value, valueInput);\n' +
    t*4 + 'var swatch = modal.querySelector(\'.eff-color-swatch\');\n' +
    t*4 + 'if (swatch) { swatch.style.background = res.value; }\n' +
    t*3 + '});'
)

content = replace_once(content, old9, new9, 'CHANGE 9')

# ===========================================================================
# CHANGE 10 — Insert validation methods before MODAL HELPERS
# ===========================================================================

old10 = (
    t + '// -----------------------------------------------------------------------\n' +
    t + '// MODAL HELPERS\n' +
    t + '// -----------------------------------------------------------------------'
)

# Build the _normalizeColorValue method body carefully
# The instruction's code uses 2-tab indent for method body lines
norm_body = (
    t*2 + "var v = (typeof raw === 'string' ? raw : '').trim();\n" +
    '\n' +
    t*2 + '// ---- HEX / HEXA ----\n' +
    t*2 + "if (format === 'HEX' || format === 'HEXA') {\n" +
    t*3 + "var bare = v.replace(/^#/, '').toUpperCase();\n" +
    t*3 + '// Expand 3-char shorthand: FFF \u2192 FFFFFF\n' +
    t*3 + 'if (/^[0-9A-F]{3}$/.test(bare)) {\n' +
    t*4 + 'bare = bare[0]+bare[0] + bare[1]+bare[1] + bare[2]+bare[2];\n' +
    t*3 + '}\n' +
    t*3 + "if (format === 'HEX') {\n" +
    t*4 + 'if (!/^[0-9A-F]{6}$/.test(bare)) {\n' +
    t*5 + "return { value: v, error: 'HEX color must be 3 or 6 hex digits (0\u20139, A\u2013F). Example: #FF5733 or #F53' };\n" +
    t*4 + '}\n' +
    t*4 + "return { value: '#' + bare, error: null };\n" +
    t*3 + '}\n' +
    t*3 + '// HEXA: accept 6 (append FF) or 8 digits.\n' +
    t*3 + "if (/^[0-9A-F]{6}$/.test(bare)) { bare += 'FF'; }\n" +
    t*3 + 'if (!/^[0-9A-F]{8}$/.test(bare)) {\n' +
    t*4 + "return { value: v, error: 'HEXA color must be 6 or 8 hex digits. Example: #FF5733CC' };\n" +
    t*3 + '}\n' +
    t*3 + "return { value: '#' + bare, error: null };\n" +
    t*2 + '}\n' +
    '\n' +
    t*2 + '// ---- RGB / RGBA ----\n' +
    t*2 + "if (format === 'RGB' || format === 'RGBA') {\n" +
    t*3 + "var inner = v.replace(/^rgba?\\s*\\(/i, '').replace(/\\)\\s*$/, '').trim();\n" +
    t*3 + "var parts = inner.split(/[\\s,]+/).filter(function (s) { return s !== ''; });\n" +
    t*3 + "var need  = (format === 'RGBA') ? 4 : 3;\n" +
    t*3 + 'if (parts.length < need) {\n' +
    t*4 + "return { value: v, error: format + ' requires ' + need + ' values separated by commas. Example: ' + (format === 'RGB' ? 'rgb(255, 87, 51)' : 'rgba(255, 87, 51, 0.8)') };\n" +
    t*3 + '}\n' +
    t*3 + 'var r = parseInt(parts[0], 10);\n' +
    t*3 + 'var g = parseInt(parts[1], 10);\n' +
    t*3 + 'var b = parseInt(parts[2], 10);\n' +
    t*3 + 'if (isNaN(r) || isNaN(g) || isNaN(b)) {\n' +
    t*4 + "return { value: v, error: 'RGB channel values must be whole numbers (0\u2013255)' };\n" +
    t*3 + '}\n' +
    t*3 + 'r = Math.max(0, Math.min(255, r));\n' +
    t*3 + 'g = Math.max(0, Math.min(255, g));\n' +
    t*3 + 'b = Math.max(0, Math.min(255, b));\n' +
    t*3 + "if (format === 'RGB') {\n" +
    t*4 + "return { value: 'rgb(' + r + ', ' + g + ', ' + b + ')', error: null };\n" +
    t*3 + '}\n' +
    t*3 + 'var a = parseFloat(parts[3]);\n' +
    t*3 + 'if (isNaN(a)) {\n' +
    t*4 + "return { value: v, error: 'RGBA alpha must be a decimal number (0\u20131). Example: 0.5' };\n" +
    t*3 + '}\n' +
    t*3 + 'a = Math.round(Math.max(0, Math.min(1, a)) * 100) / 100;\n' +
    t*3 + "return { value: 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')', error: null };\n" +
    t*2 + '}\n' +
    '\n' +
    t*2 + '// ---- HSL / HSLA ----\n' +
    t*2 + "if (format === 'HSL' || format === 'HSLA') {\n" +
    t*3 + "var inner2 = v.replace(/^hsla?\\s*\\(/i, '').replace(/\\)\\s*$/, '').trim();\n" +
    t*3 + "var raw2   = inner2.replace(/%/g, '');\n" +
    t*3 + "var pts    = raw2.split(/[\\s,]+/).filter(function (s) { return s !== ''; });\n" +
    t*3 + "var need2  = (format === 'HSLA') ? 4 : 3;\n" +
    t*3 + 'if (pts.length < need2) {\n' +
    t*4 + "return { value: v, error: format + ' requires ' + need2 + ' values. Example: ' + (format === 'HSL' ? 'hsl(200, 60%, 40%)' : 'hsla(200, 60%, 40%, 0.8)') };\n" +
    t*3 + '}\n' +
    t*3 + 'var h = parseFloat(pts[0]);\n' +
    t*3 + 'var s = parseFloat(pts[1]);\n' +
    t*3 + 'var l = parseFloat(pts[2]);\n' +
    t*3 + 'if (isNaN(h) || isNaN(s) || isNaN(l)) {\n' +
    t*4 + "return { value: v, error: 'HSL values must be numbers: hue (0\u2013360), saturation (0\u2013100), lightness (0\u2013100)' };\n" +
    t*3 + '}\n' +
    t*3 + 'h = Math.round(((h % 360) + 360) % 360);\n' +
    t*3 + 's = Math.round(Math.max(0, Math.min(100, s)));\n' +
    t*3 + 'l = Math.round(Math.max(0, Math.min(100, l)));\n' +
    t*3 + "if (format === 'HSL') {\n" +
    t*4 + "return { value: 'hsl(' + h + ', ' + s + '%, ' + l + '%)', error: null };\n" +
    t*3 + '}\n' +
    t*3 + 'var a2 = parseFloat(pts[3]);\n' +
    t*3 + 'if (isNaN(a2)) {\n' +
    t*4 + "return { value: v, error: 'HSLA alpha must be a decimal number (0\u20131). Example: 0.5' };\n" +
    t*3 + '}\n' +
    t*3 + 'a2 = Math.round(Math.max(0, Math.min(1, a2)) * 100) / 100;\n' +
    t*3 + "return { value: 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a2 + ')', error: null };\n" +
    t*2 + '}\n' +
    '\n' +
    t*2 + "return { value: v, error: null };\n"
)

show_body = (
    t*2 + 'this._clearFieldError(input);\n' +
    t*2 + "var el  = document.createElement('div');\n" +
    t*2 + "el.className = 'eff-inline-error';\n" +
    t*2 + 'el.textContent = message;\n' +
    t*2 + 'var rect   = input.getBoundingClientRect();\n' +
    t*2 + "el.style.left = rect.left + 'px';\n" +
    t*2 + "el.style.top  = (rect.bottom + 4) + 'px';\n" +
    t*2 + 'document.body.appendChild(el);\n' +
    t*2 + 'input._effError = el;\n' +
    t*2 + 'var timer = setTimeout(function () {\n' +
    t*3 + 'if (el.parentNode) { el.parentNode.removeChild(el); }\n' +
    t*3 + 'if (input._effError === el) { input._effError = null; }\n' +
    t*2 + '}, 3500);\n' +
    t*2 + 'input._effErrorTimer = timer;\n'
)

clear_body = (
    t*2 + 'if (input._effError) {\n' +
    t*3 + 'if (input._effError.parentNode) { input._effError.parentNode.removeChild(input._effError); }\n' +
    t*3 + 'input._effError = null;\n' +
    t*2 + '}\n' +
    t*2 + 'if (input._effErrorTimer) {\n' +
    t*3 + 'clearTimeout(input._effErrorTimer);\n' +
    t*3 + 'input._effErrorTimer = null;\n' +
    t*2 + '}\n'
)

new10 = (
    t + '// -----------------------------------------------------------------------\n' +
    t + '// FIELD VALIDATION + ERROR DISPLAY\n' +
    t + '// -----------------------------------------------------------------------\n' +
    '\n' +
    t + '/**\n' +
    t + ' * Normalize and validate a user-entered color value for the given format.\n' +
    t + ' * Auto-corrects common mistakes; returns error string for fatal failures.\n' +
    t + ' *\n' +
    t + ' * @param {string} raw    Raw user input.\n' +
    t + ' * @param {string} format HEX | HEXA | RGB | RGBA | HSL | HSLA\n' +
    t + ' * @returns {{ value: string, error: string|null }}\n' +
    t + ' */\n' +
    t + '_normalizeColorValue: function (raw, format) {\n' +
    norm_body +
    t + '},\n' +
    '\n' +
    t + '/**\n' +
    t + ' * Show a floating inline error tooltip below an input element.\n' +
    t + ' * Auto-dismisses after 3.5 seconds.\n' +
    t + ' *\n' +
    t + ' * @param {HTMLElement} input   The input with the invalid value.\n' +
    t + ' * @param {string}      message Error message to display.\n' +
    t + ' */\n' +
    t + '_showFieldError: function (input, message) {\n' +
    show_body +
    t + '},\n' +
    '\n' +
    t + '/**\n' +
    t + ' * Remove any visible field error tooltip for an input.\n' +
    t + ' *\n' +
    t + ' * @param {HTMLElement} input\n' +
    t + ' */\n' +
    t + '_clearFieldError: function (input) {\n' +
    clear_body +
    t + '},\n' +
    '\n' +
    t + '// -----------------------------------------------------------------------\n' +
    t + '// MODAL HELPERS\n' +
    t + '// -----------------------------------------------------------------------'
)

content = replace_once(content, old10, new10, 'CHANGE 10')

# ===========================================================================
# Write result
# ===========================================================================

if content == original:
    print('ERROR: No changes were made.')
    sys.exit(1)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print('Done. File written successfully.')
