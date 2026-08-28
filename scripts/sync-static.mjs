import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectory = path.join(root, 'public');
const staticDirectories = ['css', 'js', 'img', 'content'];

await mkdir(publicDirectory, { recursive: true });

for (const directory of staticDirectories) {
  const source = path.join(root, directory);
  const destination = path.join(publicDirectory, directory);
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
}

console.log(`Synced ${staticDirectories.join(', ')} to public/.`);
