// Seeds the SQLite store with the JSON files in ./seed/ when the store is empty.
// Each JSON file is a full intake; the seeder computes helpScore from the
// embedded analysis object.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './store.js';
import { computeHelpScore } from './help-score.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, 'seed');

export function seedIfEmpty() {
  if (!store.isEmpty()) return;

  let files;
  try {
    files = fs.readdirSync(SEED_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort();
  } catch (err) {
    console.warn(`No seed directory at ${SEED_DIR}; skipping seed.`);
    return;
  }

  if (files.length === 0) {
    console.log('No seed files found; skipping seed.');
    return;
  }

  console.log(`Seeding ${files.length} demo intake records...`);
  const summaries = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(SEED_DIR, file), 'utf8');
      const intake = JSON.parse(raw);

      if (intake.analysis && intake.helpScore == null) {
        const { score } = computeHelpScore(intake.analysis);
        intake.helpScore = score;
      }

      if (!intake.screeningUpdatedAt) {
        intake.screeningUpdatedAt = intake.createdAt || new Date().toISOString();
      }

      store.create(intake);
      summaries.push(`${intake.clientName} (${intake.needCategory}/${intake.analysis?.severity?.level || 'unknown'})`);
    } catch (err) {
      console.error(`Failed to load seed ${file}:`, err.message);
    }
  }
  console.log(`Seeded: ${summaries.join(', ')}`);
}
