// tests/smoke.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount } from '../src/lib/money.js';
import { parseDate, monthOf } from '../src/lib/dates.js';

test('a plain amount is read as cents', () => {
  assert.equal(parseAmount('12.50'), 1250);
});

test('an amount in brackets is money coming back', () => {
  assert.equal(parseAmount('(12.50)'), -1250);
});

test('an amount with a leading minus is money coming back', () => {
  assert.equal(parseAmount('-2100.00'), -210000);
});

test('a date is read as day, month, year', () => {
  assert.equal(parseDate('05/09/2026'), '2026-09-05');
  assert.equal(monthOf('05/09/2026'), '2026-09');
});
