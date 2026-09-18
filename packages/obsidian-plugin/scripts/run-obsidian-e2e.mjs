import { ObsidianE2EHarness } from './e2e/harness.mjs';
import { runPhase1Tests } from './e2e/phase1-session-sync.mjs';
import { runPhase2Tests } from './e2e/phase2-web-calendar.mjs';

const args = process.argv.slice(2);
const phaseArg = args.find((a) => a.startsWith('--phase='))?.split('=')[1] || 'all';

console.log(`🚀 Starting Obsidian E2E Runner (Phase target: ${phaseArg})`);

const harness = new ObsidianE2EHarness();

try {
  await harness.setupBackendEnvironment();
  harness.buildPlugin();
  harness.configureTestVaultSettings();
  await harness.launchObsidian();

  if (phaseArg === '1' || phaseArg === 'all') {
    await runPhase1Tests(harness);
  }

  if (phaseArg === '2' || phaseArg === 'all') {
    await runPhase2Tests(harness);
  }
} catch (err) {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
} finally {
  await harness.close();
}
