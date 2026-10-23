const { readFileSync, writeFileSync } = require('node:fs');
const file = process.argv[2];
if (!file || process.argv.length !== 3) throw new Error('Usage: node configure-apt-mirror.cjs <apt-mirrors.txt>');
const source = readFileSync(file, 'utf8');
// shortcut: format actuel de runner-images uniquement, adapter si sa liste de miroirs change.
const mirrorLine = /^(?:http:\/\/azure\.archive\.ubuntu\.com|https:\/\/archive\.ubuntu\.com)\/ubuntu\/\tpriority:1\r?$/gm;
if (!source.match(mirrorLine)) throw new Error('Format APT inattendu : miroir Ubuntu priorité 1 absent');
const updated = source.replace(mirrorLine, line => line.replace('http://azure.archive.ubuntu.com', 'https://archive.ubuntu.com'));
if (updated.includes('azure.archive.ubuntu.com')) throw new Error('Format APT inattendu : URI Azure non reconnue');
if (updated !== source) writeFileSync(file, updated);
