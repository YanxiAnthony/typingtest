'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectDir = path.resolve(__dirname, '..');
const resourceDirectory = 'NCE';
const sourceDir = path.join(projectDir, resourceDirectory);
const outputFile = path.join(projectDir, 'assets', 'default-library.json');
const outputScriptFile = path.join(projectDir, 'assets', 'default-library.js');
const audioExtensions = new Set(['.mp3', '.m4a', '.ogg', '.wav']);
const lessons = [];

for (const group of fs.readdirSync(sourceDir, { withFileTypes: true })) {
  if (!group.isDirectory()) continue;
  const groupDir = path.join(sourceDir, group.name);
  const files = fs.readdirSync(groupDir);
  const byBase = new Map();

  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    const base = path.basename(file, extension);
    if (!byBase.has(base)) byBase.set(base, {});
    if (extension === '.lrc') byBase.get(base).lrc = file;
    if (audioExtensions.has(extension)) byBase.get(base).audio = file;
  }

  for (const [base, pair] of byBase) {
    if (!pair.audio || !pair.lrc) continue;
    const relativeBase = group.name + '/' + base;
    lessons.push({
      id: 'us/' + relativeBase,
      book: 'us',
      group: group.name,
      filename: relativeBase,
      title: base.replace(/^\d+(?:&\d+)?[.\s-]*/, ''),
      audioUrl: resourceDirectory + '/' + group.name + '/' + pair.audio,
      lrcUrl: resourceDirectory + '/' + group.name + '/' + pair.lrc,
      lrcText: fs.readFileSync(path.join(groupDir, pair.lrc), 'utf8'),
      hasAudio: true,
      hasLrc: true,
      source: 'default'
    });
  }
}

lessons.sort((a, b) => a.filename.localeCompare(b.filename, 'en', { numeric: true }));
const catalog = lessons.map(({ lrcText, ...lesson }) => lesson);
fs.writeFileSync(outputFile, JSON.stringify(catalog, null, 2) + '\n');

// Android WebView opens the app from file:///android_asset. fetch() cannot
// reliably read files from that origin, so provide the catalog and subtitles
// as an ordinary script as well. The JSON file remains available to the web
// server build and tooling.
const embeddedCatalog = JSON.stringify(lessons, null, 2)
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');
fs.writeFileSync(
  outputScriptFile,
  `'use strict';\nwindow.NCE_DEFAULT_LIBRARY = ${embeddedCatalog};\n`
);
console.log(`default library: ${lessons.length} lessons -> ${outputFile}, ${outputScriptFile}`);
