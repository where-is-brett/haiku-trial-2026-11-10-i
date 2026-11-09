// tests/statement.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement } from '../src/lib/statement.js';

test('a statement is read into dated rows in cents', () => {
  const rows = parseStatement('Date,Description,Amount\r\n03/08/2026,Kestrel Coffee Bar,6.50\r\n');
  assert.deepEqual(rows, [{ date: '2026-08-03', description: 'Kestrel Coffee Bar', cents: 650 }]);
});

test('CRLF endings and a trailing blank line are ignored', () => {
  const rows = parseStatement('Date,Description,Amount\r\n03/08/2026,A,1.00\r\n\r\n');
  assert.equal(rows.length, 1);
});

test('a header with no rows is a statement with nothing in it', () => {
  assert.deepEqual(parseStatement('Date,Description,Amount\r\n'), []);
});

test('a date not written DD/MM/YYYY is not a statement', () => {
  assert.equal(parseStatement('Date,Description,Amount\n5/9/2026,A,1.00'), null);
});

test('a quoted description may hold a comma, and a quoted amount a thousands comma', () => {
  const rows = parseStatement('Date,Description,Amount\n03/08/2026,"Marlowe, Homewares","1,234.50"');
  assert.deepEqual(rows, [{ date: '2026-08-03', description: 'Marlowe, Homewares', cents: 123450 }]);
});

test('brackets and minus signs come back as negative cents', () => {
  const rows = parseStatement('Date,Description,Amount\n19/08/2026,Marlowe,(40.00)\n25/08/2026,Payroll,-2100.00');
  assert.deepEqual(rows.map((r) => r.cents), [-4000, -210000]);
});

test('the description is trimmed', () => {
  assert.equal(parseStatement('Date,Description,Amount\n03/08/2026,  Kestrel  ,1.00')[0].description, 'Kestrel');
});

test('a wrong header is not a statement', () => {
  assert.equal(parseStatement('Date,Payee,Amount\n03/08/2026,A,1.00'), null);
});

test('an empty file is not a statement', () => {
  assert.equal(parseStatement(''), null);
});

test('a row with a bad date or amount is not a statement', () => {
  assert.equal(parseStatement('Date,Description,Amount\n2026-08-03,A,1.00'), null);
  assert.equal(parseStatement('Date,Description,Amount\n03/08/2026,A,lots'), null);
});

test('a row with the wrong number of fields is not a statement', () => {
  assert.equal(parseStatement('Date,Description,Amount\n03/08/2026,A,1.00,extra'), null);
});
