const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
const version = require('../package.json').version;
const platform = process.argv.includes('--mac') ? 'mac' : 'windows';
const source = path.join(root, 'release');
const manifestName = platform === 'mac' ? 'latest-mac.yml' : 'latest.yml';
const manifest = yaml.load(fs.readFileSync(path.join(source, manifestName), 'utf8'));
if (manifest.version !== version || !manifest.files?.length) throw Error('Release version mismatch or empty manifest');
const names = new Set([manifestName]);
for (const file of manifest.files) {
  const name = decodeURIComponent(file.url);
  if (path.basename(name) !== name || name.includes('\\')) throw Error('Invalid artifact name');
  const bytes = fs.readFileSync(path.join(source, name));
  if (bytes.length !== file.size || crypto.createHash('sha512').update(bytes).digest('base64') !== file.sha512) {
    throw Error(`Artifact checksum mismatch: ${name}`);
  }
  names.add(name);
}
if (platform === 'mac') {
  for (const name of fs.readdirSync(source)) {
    if (name.startsWith(`SV-Browser-Automate-Editor-${version}-mac-`) && /\.(dmg|zip)$/.test(name)) names.add(name);
  }
}
for (const name of [...names]) {
  if (fs.existsSync(path.join(source, name + '.blockmap'))) names.add(name + '.blockmap');
}
const destination = path.join(source, version, platform);
fs.mkdirSync(destination, { recursive: true });
for (const name of names) fs.copyFileSync(path.join(source, name), path.join(destination, name));
if (platform === 'windows') {
  const portable = `SV-Browser-Automate-Editor-${version}.exe`;
  if (fs.existsSync(path.join(source, portable))) {
    const portableDir = path.join(source, version, 'portable');
    fs.mkdirSync(portableDir, { recursive: true });
    fs.copyFileSync(path.join(source, portable), path.join(portableDir, portable));
  }
}
const notes = path.join(root, `RELEASE_NOTES_${version}.md`);
if (fs.existsSync(notes)) fs.copyFileSync(notes, path.join(source, version, 'RELEASE_NOTES.md'));
console.log(`Release files ready: ${destination}`);
console.log([...names].join('\n'));
