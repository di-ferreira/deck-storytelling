import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'deck_storytelling.json');
const destination = resolve(root, 'resources', 'decks', 'entrelinhas-storytelling-v4.json');

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);

const size = statSync(destination).size;
console.log(`[story-deck] deck incorporado: ${destination} (${size} bytes)`);
