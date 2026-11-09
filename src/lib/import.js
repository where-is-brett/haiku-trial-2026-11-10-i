// src/lib/import.js
import { parseStatement } from './statement.js';

// A row's duplicate key: date, description and cents. The date has no '|' and cents is a
// trailing integer, so the key cannot be read two ways.
function keyOf(row) {
  return `${row.date}|${row.description}|${row.cents}`;
}

// Writes a statement into the ledger in one transaction, skipping rows already stored.
// Returns null and writes nothing when the text is not a statement.
export function importStatement(db, text) {
  const rows = parseStatement(text);
  if (rows === null) return null;

  db.exec('BEGIN');
  try {
    // Existing keys are read before any insert, so repeated lines within this file are all added.
    const existing = new Set(
      db.prepare('SELECT date, description, cents FROM transactions').all().map(keyOf),
    );
    const insert = db.prepare('INSERT INTO transactions (date, description, cents) VALUES (?, ?, ?)');
    let added = 0;
    let skipped = 0;
    for (const row of rows) {
      if (existing.has(keyOf(row))) {
        skipped += 1;
      } else {
        insert.run(row.date, row.description, row.cents);
        added += 1;
      }
    }
    db.exec('COMMIT');
    return { added, skipped };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
