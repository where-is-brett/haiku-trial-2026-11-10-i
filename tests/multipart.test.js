// tests/multipart.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statementFromMultipart } from '../src/lib/multipart.js';

const B = 'XyZ123';
const body = (...parts) => Buffer.from(parts.map((p) => `--${B}\r\n${p}\r\n`).join('') + `--${B}--\r\n`);

test('the statement field is read from the body', () => {
  const b = body(
    'Content-Disposition: form-data; name="statement"; filename="s.csv"\r\nContent-Type: text/csv\r\n\r\nDate,Description,Amount\r\n',
  );
  assert.equal(statementFromMultipart(b, `multipart/form-data; boundary=${B}`), 'Date,Description,Amount\r\n');
});

test('a body without the statement field gives null', () => {
  const b = body('Content-Disposition: form-data; name="other"\r\n\r\nx');
  assert.equal(statementFromMultipart(b, `multipart/form-data; boundary=${B}`), null);
});

test('a request without a boundary gives null', () => {
  assert.equal(statementFromMultipart(Buffer.from(''), 'text/plain'), null);
  assert.equal(statementFromMultipart(Buffer.from(''), undefined), null);
});

test('a quoted boundary is read the same as an unquoted one', () => {
  const b = body('Content-Disposition: form-data; name="statement"\r\n\r\nDate\r\n');
  assert.equal(statementFromMultipart(b, `multipart/form-data; boundary="${B}"`), 'Date\r\n');
});

test('a part named by filename alone is not the statement field', () => {
  const b = body('Content-Disposition: form-data; name="other"; filename="statement"\r\n\r\nx');
  assert.equal(statementFromMultipart(b, `multipart/form-data; boundary=${B}`), null);
});

test('the statement is found after other fields and its UTF-8 text is decoded', () => {
  const b = body(
    'Content-Disposition: form-data; name="note"\r\n\r\nhello',
    'Content-Disposition: form-data; name="statement"; filename="s.csv"\r\n\r\nDescription\r\nCafé\r\n',
  );
  assert.equal(statementFromMultipart(b, `multipart/form-data; boundary=${B}`), 'Description\r\nCafé\r\n');
});
