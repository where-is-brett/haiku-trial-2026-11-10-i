// src/server.js
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { openLedger } from './lib/ledger.js';
import { importStatement } from './lib/import.js';
import { statementFromMultipart } from './lib/multipart.js';

const STATEMENT_IMPORT = false;
const port = Number(process.env.PORT ?? 3000);

function page(body) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Spending tracker</title></head>
<body>
<main>
<h1>Spending tracker</h1>
${body}
</main>
</body>
</html>
`;
}

const IMPORT_FORM = `<form method="post" action="/import" enctype="multipart/form-data">
<input type="file" name="statement" accept=".csv,text/csv">
<button type="submit">Import</button>
</form>`;

function html(res, status, body) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(page(body));
}

function notFound(res) {
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
    req.on('aborted', () => reject(new Error('upload aborted')));
  });
}

// The server with its ledger and the statement-import flag passed in, so tests can run it on
// port 0 against an in-memory ledger.
export function buildServer({ db, statementImport }) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
      const { n } = db.prepare('SELECT COUNT(*) AS n FROM transactions').get();
      const body = n === 0 ? '<p>Nothing imported yet</p>' : `<p>${n} transactions imported</p>`;
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page(body));
      return;
    }
    if (url.pathname === '/import' && statementImport) {
      if (req.method === 'GET') {
        html(res, 200, IMPORT_FORM);
        return;
      }
      if (req.method === 'POST') {
        try {
          const body = await readBody(req);
          const text = statementFromMultipart(body, req.headers['content-type']);
          const result = text ? importStatement(db, text) : null;
          if (result === null) {
            html(res, 400, `<p>That file isn&#39;t a bank statement.</p>\n${IMPORT_FORM}`);
            return;
          }
          html(res, 200, `<p>Added ${result.added}, skipped ${result.skipped}</p>`);
        } catch {
          html(res, 500, '<p>Something went wrong reading that upload.</p>');
        }
        return;
      }
    }
    notFound(res);
  });
}

// Run the server only when this file is the entry point, not when a test imports it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openLedger(process.env.LEDGER_DB ?? 'ledger.db');
  const server = buildServer({ db, statementImport: STATEMENT_IMPORT });
  server.listen(port, () => {
    console.log(`listening on ${server.address().port}`);
  });
}
