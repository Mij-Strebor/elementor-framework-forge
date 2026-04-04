// Patch script — run with: node _patch_panel_right.js
var fs = require('fs');
var file = __dirname + '/eff-panel-right.js';
var src = fs.readFileSync(file, 'utf8');

// Edit 4a: add var syncHandler; before EFF.Modal.open({ in _openSyncOptionsDialog
// The _openSyncOptionsDialog method starts and immediately calls EFF.Modal.open with 'Fetch Elementor Data'
src = src.replace(
	/_openSyncOptionsDialog: function \(\) \{\n(\t+)EFF\.Modal\.open\(\{/,
	function (match, indent) {
		return '_openSyncOptionsDialog: function () {\n' + indent + 'var syncHandler;\n' + indent + 'EFF.Modal.open({';
	}
);

// Edit 4b: add onClose to the Fetch Elementor Data modal
src = src.replace(
	/(footer: '<div style="display:flex;justify-content:flex-end;gap:8px">'\s*\+ '<button class="eff-btn eff-btn--secondary" id="eff-sync-cancel">Cancel<\/button>'\s*\+ '<button class="eff-btn" id="eff-sync-confirm">Sync<\/button>'\s*\+ '<\/div>',\s*\}\);)/,
	function (match) {
		return match.replace(/\t\}\);/, function(m) {
			return m.replace('});', "onClose: function () { document.removeEventListener('click', syncHandler); },\n\t\t\t});");
		});
	}
);

// Edit 4c: change }); closing syncHandler fn to }; + add addEventListener
src = src.replace(
	/(\t\t\t\t}\n\t\t\t}\n\t\t\t}\);\n\t\t\},\n\n\t\t\/\/ --)/,
	function (match) {
		return match.replace('\t\t\t});\n\t\t},\n\n\t\t// --', '\t\t\t};\n\t\t\tdocument.addEventListener(\'click\', syncHandler);\n\t\t},\n\n\t\t// --');
	}
);

fs.writeFileSync(file, src, 'utf8');
console.log('Done');
