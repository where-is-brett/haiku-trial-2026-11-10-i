<!-- docs/decisions/2026-11-10-how-a-statement-row-is-read-when-its-description-c.md -->
# How a statement row is read when its description contains a comma

- **Date:** 10 November 2026
- **Piece:** statement-import
- **Options:** A. Read double-quoted fields, so a comma inside quotes stays in the description (A small quote-aware splitter, about 20 lines; Can be undone) · B. Split on every comma; a row with an extra comma refuses the whole file (Simplest, but real statements with commas are refused; Can be undone)
- **Recommended:** quoted
- **Chosen:** quoted
- **The director's words:** none
