import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// O harness @vscode/test-electron quebra caminhos com espaços no Windows.
// Preparamos um espelho temporário sem espaços para executar os testes.
const stageRoot = join(tmpdir(), 'story-deck-it');
const workspaceRoot = join(stageRoot, 'workspace');

function stage() {
  rmSync(stageRoot, { recursive: true, force: true });
  mkdirSync(workspaceRoot, { recursive: true });
  cpSync(join(repoRoot, 'package.json'), join(stageRoot, 'package.json'));
  cpSync(join(repoRoot, 'dist'), join(stageRoot, 'dist'), { recursive: true });
  cpSync(join(repoRoot, 'resources'), join(stageRoot, 'resources'), { recursive: true });
  cpSync(join(repoRoot, 'out', 'test', 'integration'), join(stageRoot, 'out', 'test', 'integration'), { recursive: true });
}

async function main() {
  try {
    stage();
    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath: stageRoot,
      extensionTestsPath: join(stageRoot, 'out', 'test', 'integration', 'index.js'),
      launchArgs: [workspaceRoot, '--disable-extensions', '--no-sandbox'],
    });
  } catch (error) {
    console.error('[story-deck] falha nos testes de integração:', error);
    process.exitCode = 1;
  } finally {
    rmSync(stageRoot, { recursive: true, force: true });
  }
}

main();
