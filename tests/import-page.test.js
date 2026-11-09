// tests/import-page.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openLedger } from '../src/lib/ledger.js';
import { buildServer } from '../src/server.js';

const STATEMENT = 'Date,Description,Amount\r\n03/08/2026,Kestrel,6.50\r\n07/08/2026,Brightfield,121.00\r\n';

async function start(statementImport = true) {
  const db = openLedger(':memory:');
  const server = buildServer({ db, statementImport });
  await new Promise((resolve) => server.listen(0, resolve));
  return { db, server, base: `http://localhost:${server.address().port}` };
}

function upload(text) {
  const form = new FormData();
  form.append('statement', new Blob([text]), 'statement.csv');
  return form;
}

test('GET /import shows the statement form', async () => {
  const { server, base } = await start();
  const html = await (await fetch(`${base}/import`)).text();
  server.close();
  assert.match(html, /<input type="file" name="statement"/);
});

test('import reads a statement and skips duplicates on re-upload', async () => {
  const { server, base, db } = await start();
  const first = await (await fetch(`${base}/import`, { method: 'POST', body: upload(STATEMENT) })).text();
  const second = await (await fetch(`${base}/import`, { method: 'POST', body: upload(STATEMENT) })).text();
  server.close();
  assert.match(first, /Added 2, skipped 0/);
  assert.match(second, /Added 0, skipped 2/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 2);
});

test('a file that is not a statement adds nothing and shows the plain error', async () => {
  const { server, base, db } = await start();
  const res = await fetch(`${base}/import`, { method: 'POST', body: upload('Payee,Amount\nKestrel,6.50\n') });
  const html = await res.text();
  server.close();
  assert.equal(res.status, 400);
  assert.match(html, /That file isn&#39;t a bank statement\.|That file isn't a bank statement\./);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 0);
});

test('an upload with no file, or an empty file, shows the plain error', async () => {
  const { server, base, db } = await start();
  const empty = await fetch(`${base}/import`, { method: 'POST', body: upload('') });
  const none = await fetch(`${base}/import`, { method: 'POST', body: new FormData() });
  server.close();
  assert.match(await empty.text(), /isn(&#39;|')t a bank statement/);
  assert.match(await none.text(), /isn(&#39;|')t a bank statement/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 0);
});

test('a header with no rows adds nothing and says Added 0, skipped 0', async () => {
  const { server, base } = await start();
  const html = await (await fetch(`${base}/import`, { method: 'POST', body: upload('Date,Description,Amount\r\n') })).text();
  server.close();
  assert.match(html, /Added 0, skipped 0/);
});

test('a failed upload answers 500 and the server keeps running', async () => {
  const { db, server, base } = await start();
  db.exec('DROP TABLE transactions');
  const res = await fetch(`${base}/import`, { method: 'POST', body: upload(STATEMENT) });
  const html = await res.text();
  assert.equal(res.status, 500);
  assert.match(html, /Something went wrong reading that upload\./);
  assert.doesNotMatch(html, /no such table/);
  // The home page counts rows, so the table is restored before asking for it.
  db.exec('CREATE TABLE transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)');
  const home = await fetch(`${base}/`);
  server.close();
  assert.equal(home.status, 200);
});

test('with the flag off, /import is a 404', async () => {
  const { server, base } = await start(false);
  const get = await fetch(`${base}/import`);
  const post = await fetch(`${base}/import`, { method: 'POST', body: upload(STATEMENT) });
  server.close();
  assert.equal(get.status, 404);
  assert.equal(post.status, 404);
});
