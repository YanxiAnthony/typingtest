'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectDir = path.resolve(__dirname, '..');
const resourceDirectory = 'NCE';
const sourceDir = path.join(projectDir, resourceDirectory);
const outputFile = path.join(projectDir, 'assets', 'default-library.json');
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
      hasAudio: true,
      hasLrc: true,
      source: 'default'
    });
  }
}

lessons.sort((a, b) => a.filename.localeCompare(b.filename, 'en', { numeric: true }));
fs.writeFileSync(outputFile, JSON.stringify(lessons, null, 2) + '\n');
console.log(`default library: ${lessons.length} lessons -> ${outputFile}`);
