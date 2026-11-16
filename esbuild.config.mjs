import { build } from 'esbuild';

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: ['src/extension/extension.ts'],
  outfile: 'dist/extension.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['vscode'],
  sourcemap: true,
  logLevel: 'info',
};

if (watch) {
  const context = await (await import('esbuild')).context(options);
  await context.watch();
  console.log('[story-deck] observando alterações no Extension Host...');
} else {
  await build(options);
}
