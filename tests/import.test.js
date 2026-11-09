// tests/import.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openLedger } from '../src/lib/ledger.js';
import { importStatement } from '../src/lib/import.js';

const STATEMENT = 'Date,Description,Amount\n03/08/2026,Kestrel,6.50\n07/08/2026,Brightfield,121.00\n';

test('import reads a statement and skips duplicates on re-upload', () => {
  const db = openLedger(':memory:');
  assert.deepEqual(importStatement(db, STATEMENT), { added: 2, skipped: 0 });
  assert.deepEqual(importStatement(db, STATEMENT), { added: 0, skipped: 2 });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 2);
});

test('a file with the same line twice adds both the first time', () => {
  const db = openLedger(':memory:');
  const twice = 'Date,Description,Amount\n03/08/2026,Kestrel,6.50\n03/08/2026,Kestrel,6.50\n';
  assert.deepEqual(importStatement(db, twice), { added: 2, skipped: 0 });
});

test('a file that is not a statement adds nothing and returns null', () => {
  const db = openLedger(':memory:');
  assert.equal(importStatement(db, 'Payee,Amount\nKestrel,6.50\n'), null);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 0);
});

test('stored dates are ISO and amounts are cents', () => {
  const db = openLedger(':memory:');
  importStatement(db, 'Date,Description,Amount\n03/08/2026,Marlowe,(40.00)\n');
  assert.deepEqual({ ...db.prepare('SELECT date, description, cents FROM transactions').get() }, {
    date: '2026-08-03',
    description: 'Marlowe',
    cents: -4000,
  });
});
