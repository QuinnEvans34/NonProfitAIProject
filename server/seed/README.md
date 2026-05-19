# Seed cases

Each `NN-name-severity.json` file is a complete demo intake including a
pre-computed `analysis` object. `server/seed.js` loads these files and
inserts them into the SQLite store at boot when the store is empty.

These scenarios are fictional and not modeled on real cases. They exist to
exercise the dashboard's full range of severities, risk flags, and
recommended-program logic during demos.

To reset demo state:

```
rm server/data/intakes.db*
npm run dev   # seeds run on next boot
```
