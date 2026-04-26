// Reporter for the analyzer eval harness. ANSI escape codes only — no chalk.

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const ID_COLUMN_WIDTH = 36;

function pad(str, width) {
  return str.length >= width ? str : str + ' '.repeat(width - str.length);
}

function fmtSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function report(results, providerName, modelName) {
  console.log(`Running ${results.length} fixtures against ${providerName} (${modelName})...\n`);

  let passed = 0;
  let failed = 0;
  let totalMs = 0;

  for (const r of results) {
    totalMs += r.ms;
    const mark = r.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const id = pad(r.id, ID_COLUMN_WIDTH);
    const timing = pad(fmtSeconds(r.ms), 8);
    const annotation = r.annotation ? `${DIM}${r.annotation}${RESET}` : '';
    console.log(`  ${mark} ${id}${timing}${annotation}`);

    if (!r.passed) {
      for (const failure of r.failures) {
        console.log(`       ${failure.message}`);
      }
    }

    if (r.passed) passed++;
    else failed++;
  }

  const summary = `${BOLD}${passed} passed${RESET} · ${failed > 0 ? RED : ''}${failed} failed${RESET} · ${fmtSeconds(totalMs)} total`;
  console.log(`\n  ${summary}`);
}
