/* Writes the default Safari content-blocker list from blok/rules.json.
   The Blok app rewrites this list on device when settings change. */
const fs = require('node:fs');
const path = require('node:path');
const Logic = require('./blok-logic');

const root = __dirname;
const rules = JSON.parse(fs.readFileSync(path.join(root, 'rules.json'), 'utf8'));
const list = Logic.compileBlockerList(rules, {});
const out = path.join(root, '../safari/ContentBlocker/blockerList.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(list, null, 2) + '\n');
console.log('Wrote ' + list.length + ' rules to ' + out);
