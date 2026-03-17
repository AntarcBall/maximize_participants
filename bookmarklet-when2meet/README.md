# When2Meet multi-session bookmarklet

Browser bookmarklet for When2Meet-style result pages that:

- reads live page globals when available
- falls back to parsing inline page HTML
- builds 60/90 minute candidate sessions on 30-minute boundaries
- ranks 1/2/3-session weekly plans by maximum union coverage
- renders a floating shadow-DOM analysis panel on the current page

## Files

```text
bookmarklet-when2meet/
  DEV_SPEC.md
  README.md
  src/
    core.js
    bookmarklet.js
  scripts/
    build-bookmarklet.js
    verify.js
  dist/
    bookmarklet.min.js
    bookmarklet.txt
    chrome-bookmark-import.html
    install.html
```

## Build

```bash
node bookmarklet-when2meet/scripts/build-bookmarklet.js
```

The build uses local `terser` to emit a much smaller installable bookmarklet.

## Verify

```bash
node bookmarklet-when2meet/scripts/verify.js
```

## Install

### Chrome import workaround

1. Build the artifact.
2. Open `chrome://bookmarks/`
3. Use the 3-dot menu → `Import bookmarks`
4. Select `bookmarklet-when2meet/dist/chrome-bookmark-import.html`

### Drag-and-drop workaround

1. Build the artifact.
2. Open `bookmarklet-when2meet/dist/install.html` in Chrome.
3. Drag `When2Meet Analyzer` onto the bookmarks bar.

## Notes

- Person columns use Korean-locale ordering.
- Session overlap is allowed during ranking.
- Empty coverage cells use `#eceff3` so white `111` coverage stays visible.
