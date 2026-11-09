// src/lib/multipart.js

const CRLF = Buffer.from('\r\n');
const HEADER_END = Buffer.from('\r\n\r\n');

// The boundary named by a multipart content type, quoted or not, or null when there is none.
function boundaryOf(contentType) {
  if (contentType === undefined) return null;
  const match = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(String(contentType));
  return match ? (match[1] ?? match[2]) : null;
}

// A part's text when its header block names it as the statement field, otherwise null.
// Headers are read as latin1 so that only the chosen part's content is decoded as UTF-8.
function statementText(part) {
  if (!part.subarray(0, CRLF.length).equals(CRLF)) return null;
  const headerEnd = part.indexOf(HEADER_END, CRLF.length);
  if (headerEnd === -1) return null;
  const headers = part.subarray(CRLF.length, headerEnd).toString('latin1');
  if (!/(?:^|;)\s*name=(?:"statement"|statement)\s*(?:;|$)/im.test(headers)) return null;
  let content = part.subarray(headerEnd + HEADER_END.length);
  // Remove exactly the CRLF that precedes the next delimiter.
  if (content.subarray(-CRLF.length).equals(CRLF)) content = content.subarray(0, -CRLF.length);
  return content.toString('utf8');
}

// Returns the text of the statement field in a multipart body, or null when the content type has
// no boundary or the body has no statement part.
export function statementFromMultipart(body, contentType) {
  const boundary = boundaryOf(contentType);
  if (boundary === null) return null;
  const delimiter = Buffer.from(`--${boundary}`);
  let start = body.indexOf(delimiter);
  if (start === -1) return null;
  start += delimiter.length;
  for (;;) {
    const next = body.indexOf(delimiter, start);
    if (next === -1) return null;
    const text = statementText(body.subarray(start, next));
    if (text !== null) return text;
    start = next + delimiter.length;
  }
}
