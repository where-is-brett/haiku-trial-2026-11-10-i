// src/lib/statement.js
import { parseDate } from './dates.js';
import { parseAmount } from './money.js';

const HEADER = 'Date,Description,Amount';
const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
// Commas may only separate thousands groups; a plain run of digits is also allowed.
const AMOUNT_PATTERN = /^(\((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\)|-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)$/;

// True only when day, month and year name a real calendar date (29/02/2024 yes, 31/02/2026 no).
function isRealDate(day, month, year) {
  const date = new Date(Date.UTC(2000, 0, 1));
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

// Splits one CSV line into fields. A double-quoted field may hold commas,
// and "" inside quotes is one quote. Returns null when a quoted field is never closed.
// This is the only place that splits lines.
function splitFields(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  if (inQuotes) return null;
  fields.push(field);
  return fields;
}

// Reads bank statement CSV text into rows, or returns null when the text is not a statement.
export function parseStatement(text) {
  const lines = String(text)
    .split('\n')
    .map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line))
    .filter((line) => line.trim() !== '');

  if (lines.length === 0 || lines[0] !== HEADER) return null;

  const rows = [];
  for (const line of lines.slice(1)) {
    const split = splitFields(line);
    if (split === null || split.length !== 3) return null;
    const [date, description, amount] = split.map((field) => field.trim());
    const dateParts = DATE_PATTERN.exec(date);
    if (!dateParts || !AMOUNT_PATTERN.test(amount)) return null;
    if (!isRealDate(Number(dateParts[1]), Number(dateParts[2]), Number(dateParts[3]))) return null;
    rows.push({ date: parseDate(date), description, cents: parseAmount(amount) });
  }
  return rows;
}
