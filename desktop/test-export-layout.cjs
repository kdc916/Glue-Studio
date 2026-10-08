const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8'),inline=fs.readFileSync('maxVFX_Glue_Studio_Standalone.html','utf8'),addon=fs.readFileSync('v17-addon.js','utf8');
for(const h of [html,inline]){for(const x of ['export-copy','export-buttons','exportPng','exportTga','exportGif','v17WorkerStatus'])assert(h.includes(x),'missing '+x);assert.equal((h.match(/id="v17WorkerStatus"/g)||[]).length,1,'duplicate status');}
for(const s of [css,inline]){for(const x of ['grid-template-areas:"details actions" "status status"','grid-template-columns:repeat(3,minmax(0,1fr))','@media(max-width:1250px)','@media(max-width:480px)'])assert(s.includes(x),'missing responsive CSS '+x);}
assert(addon.includes("document.getElementById('v17WorkerStatus')"),'worker must reuse markup status');
console.log('PASS: layout grid, equal output buttons, separate worker status');
