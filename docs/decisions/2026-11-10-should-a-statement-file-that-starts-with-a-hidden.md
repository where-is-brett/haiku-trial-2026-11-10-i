<!-- docs/decisions/2026-11-10-should-a-statement-file-that-starts-with-a-hidden.md -->
# Should a statement file that starts with a hidden byte-order mark be read

- **Date:** 10 November 2026
- **Piece:** statement-import
- **Options:** A. Ignore a leading byte-order mark, then read the file as usual (One line in the reader and one test; Can be undone) · B. Refuse it, as the approved header rule reads today (No change; some exports must be re-saved before upload; Can be undone)
- **Recommended:** strip
- **Chosen:** strip
- **The director's words:** none
