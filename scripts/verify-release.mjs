import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const errors = [];

const requiredNodeMajor = 24;
const actualNodeMajor = Number(process.versions.node.split('.')[0]);
if (actualNodeMajor !== requiredNodeMajor) {
  errors.push(`Falsche Node-Version: ${process.versions.node}. Erforderlich ist Node ${requiredNodeMajor}.x.`);
}
const allowedRootFiles = new Set([
  '.env.example','.gitignore','.npmrc','CHECKSUMS.sha256','DEPLOYMENT.md','DEPLOYMENT_6.5.6.md',
  'FILE_MANIFEST.txt','README.md','RELEASE_NOTES_6.2.6.md','RELEASE_NOTES_6.3.1.md',
  'RELEASE_NOTES_6.3.2.md','RELEASE_NOTES_6.3.md','RELEASE_NOTES_6.4.0.md','RELEASE_NOTES_6.4.1.md',
  'RELEASE_NOTES_6.4.2.md','RELEASE_NOTES_6.5.3.md','RELEASE_NOTES_6.5.5.md','RELEASE_NOTES_6.5.6.md','RELEASE_NOTES_6.5.7.md','RELEASE_NOTES_6.5.9.md','RELEASE_NOTES_Stilrichtungen.md',
  'VERIFICATION_REPORT.md','VERIFICATION_REPORT_6.5.6.md','VERIFICATION_REPORT_6.5.9.md','VERIFICATION_REPORT_6.5.6_CLEAN.md','next-env.d.ts','next.config.js',
  'package-lock.json','package.json','tsconfig.json'
]);
const allowedRootDirs = new Set(['app','components','docs','lib','public','scripts','supabase','node_modules','.next','.git','.github']);

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && !allowedRootFiles.has(entry.name)) errors.push(`Unerlaubte Datei im Root: ${entry.name}`);
  if (entry.isDirectory() && !allowedRootDirs.has(entry.name)) errors.push(`Unerlaubter Ordner im Root: ${entry.name}`);
  if (/\(\d+\)/.test(entry.name)) errors.push(`Browser-Duplikatname im Root: ${entry.name}`);
  if (/\.zip$/i.test(entry.name)) errors.push(`ZIP-Datei im Projekt-Root: ${entry.name}`);
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules','.next','.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full)); else out.push(full);
  }
  return out;
}

const files = await walk(root);
const pages = files.filter(f => f.endsWith(`${path.sep}page.tsx`));
if (!pages.some(f => path.relative(root,f) === path.join('app','page.tsx'))) errors.push('app/page.tsx fehlt.');
for (const file of pages) {
  const rel = path.relative(root,file);
  if (!rel.startsWith(`app${path.sep}`)) errors.push(`page.tsx außerhalb von app/: ${rel}`);
  const text = await readFile(file,'utf8');
  const first = text.trimStart();
  if (first.startsWith('#') || first.startsWith('@import') || first.startsWith('---')) errors.push(`Ungültiger Inhalt in ${rel}`);
}

const hashes = new Map();
for (const file of pages) {
  const hash = createHash('sha256').update(await readFile(file)).digest('hex');
  const rel = path.relative(root,file);
  if (hashes.has(hash)) errors.push(`Byte-identische Seiten: ${hashes.get(hash)} und ${rel}`); else hashes.set(hash,rel);
}

const expected = new Map([
  ['app/page.tsx','Dashboard'],
  ['app/sales/page.tsx','SalesManager'],
  ['app/inventory/page.tsx','InventoryImport'],
]);
for (const [rel, token] of expected) {
  try {
    const text = await readFile(path.join(root,rel),'utf8');
    if (!text.includes(token)) errors.push(`${rel} bindet ${token} nicht ein.`);
  } catch { errors.push(`${rel} fehlt.`); }
}

// CSS-Vollständigkeitscheck: jede in app/components verwendete className muss in
// app/globals.css auch tatsächlich definiert sein. Verhindert unsichtbar
// unformatierte Seiten (z. B. der 6.5.6-Bug mit 33 fehlenden Klassen).
const cssFiles = files.filter(f => /\.(tsx?|jsx?)$/.test(f));
const usedClasses = new Set();
for (const file of cssFiles) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/className="([^"]*)"/g)) {
    for (const cls of match[1].split(/\s+/).filter(Boolean)) usedClasses.add(cls);
  }
}
let cssText = '';
try { cssText = await readFile(path.join(root, 'app', 'globals.css'), 'utf8'); }
catch { errors.push('app/globals.css fehlt – CSS-Vollständigkeitscheck nicht möglich.'); }
if (cssText) {
  const definedClasses = new Set([...cssText.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map(m => m[1]));
  const missing = [...usedClasses].filter(cls => !definedClasses.has(cls)).sort();
  if (missing.length) errors.push(`Verwendete CSS-Klassen ohne Definition in app/globals.css: ${missing.join(', ')}`);
}

if (errors.length) {
  console.error('\nRELEASE-PRÜFUNG FEHLGESCHLAGEN\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log(`Release-Struktur geprüft: Node ${process.versions.node}, ${pages.length} Seiten, keine Root-Streudateien, keine Seitendubletten.`);
