import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', '.next', 'node_modules']);
const ignoredFiles = new Set(['FILE_MANIFEST.txt', 'CHECKSUMS.sha256']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else {
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (!ignoredFiles.has(rel)) files.push(rel);
    }
  }
  return files.sort((a, b) => a.localeCompare(b, 'en'));
}

export async function buildGeneratedFiles() {
  const files = await walk(root);
  const manifest = `${files.join('\n')}\n`;
  const checksumLines = [];
  for (const rel of files) {
    const hash = createHash('sha256').update(await readFile(path.join(root, rel))).digest('hex');
    checksumLines.push(`${hash}  ${rel}`);
  }
  return {
    manifest,
    checksums: `${checksumLines.join('\n')}\n`,
  };
}

const mode = process.argv[2] ?? 'write';
const generated = await buildGeneratedFiles();

if (mode === 'write') {
  await writeFile(path.join(root, 'FILE_MANIFEST.txt'), generated.manifest);
  await writeFile(path.join(root, 'CHECKSUMS.sha256'), generated.checksums);
  console.log('FILE_MANIFEST.txt und CHECKSUMS.sha256 wurden aktualisiert.');
} else if (mode === 'check') {
  const mismatches = [];
  for (const [filename, expected] of [
    ['FILE_MANIFEST.txt', generated.manifest],
    ['CHECKSUMS.sha256', generated.checksums],
  ]) {
    let actual = '';
    try { actual = await readFile(path.join(root, filename), 'utf8'); }
    catch { mismatches.push(`${filename} fehlt.`); continue; }
    if (actual !== expected) mismatches.push(`${filename} ist nicht aktuell. Führe npm run release:generate aus.`);
  }
  if (mismatches.length) {
    console.error(mismatches.join('\n'));
    process.exit(1);
  }
  console.log('Manifest und Prüfsummen sind aktuell.');
} else {
  console.error(`Unbekannter Modus: ${mode}`);
  process.exit(1);
}
