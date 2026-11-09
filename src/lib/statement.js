// src/lib/statement.js
import { parseDate } from './dates.js';
import { parseAmount } from './money.js';

const HEADER = 'Date,Description,Amount';
const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
const AMOUNT_PATTERN = /^(\(\d[\d,]*(\.\d{1,2})?\)|-?\d[\d,]*(\.\d{1,2})?)$/;

// Splits one CSV line into fields. A double-quoted field may hold commas,
// and "" inside quotes is one quote. This is the only place that splits lines.
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
    const fields = splitFields(line).map((field) => field.trim());
    if (fields.length !== 3) return null;
    const [date, description, amount] = fields;
    if (!DATE_PATTERN.test(date) || !AMOUNT_PATTERN.test(amount)) return null;
    rows.push({ date: parseDate(date), description, cents: parseAmount(amount) });
  }
  return rows;
}
