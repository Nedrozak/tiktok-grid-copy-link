# TikTok Profile Grid Copy Link Button

A lightweight userscript that adds a **Copy** button to TikTok profile grid items, so you can copy direct post links straight from a user's profile page without opening each post first.

It supports both **video** and **photo** posts and is designed to work with TikTok's client-side navigation and dynamically loaded profile grids.

## Features

- Adds a copy button to each TikTok profile grid tile
- Supports both `/video/` and `/photo/` post links
- Copies a clean normalized URL without query strings or hash fragments
- Works with dynamically loaded content using `MutationObserver`
- Handles TikTok SPA route changes by patching `history.pushState` and `history.replaceState`
- Uses `GM_setClipboard` when available, with `navigator.clipboard.writeText` as fallback
- Gives quick visual feedback with `Copied` and `Failed` states
- Keeps the UI minimal and only shows the button on hover or after interaction

## Demo Behavior

On TikTok profile pages like:

```text
https://www.tiktok.com/@username
```

Each post tile gets a small button in the top-right corner. Clicking it copies the direct post URL to your clipboard.

Examples of copied links:

```text
https://www.tiktok.com/@username/video/1234567890
https://www.tiktok.com/@username/photo/1234567890
```

## Installation

### Install as a userscript

You need a userscript manager such as:

- Tampermonkey
- Violentmonkey
- Greasemonkey

Then:

1. Create a new userscript.
2. Replace the default content with the contents of `main.js`.
3. Save it.
4. Open any TikTok profile page.

## How It Works

### 1. Runs only on TikTok profile pages

The script checks the current path against this pattern:

```js
/^\/@[^/]+\/?$/;
```

That means it targets profile URLs like:

```text
/@username
```

and ignores other TikTok pages.

### 2. Finds the profile post grid

It looks for the main profile grid container:

```js
#user-post-item-list
```

Inside that container it processes tiles matching:

```js
div[data-e2e="user-post-item"]
```

### 3. Extracts supported post links

For each tile, it searches for anchors containing either:

```js
/video/
/photo/
```

If found, it builds a normalized URL by removing search params and hash fragments.

### 4. Injects a button into each tile

Each tile gets a button positioned in the top-right corner with minimal inline styling injected through a single `<style>` block.

### 5. Keeps working as TikTok changes the DOM

TikTok loads and swaps content dynamically, so the script uses:

- a grid observer to process newly added tiles
- a page observer to detect when the grid appears later
- history patching to react to SPA-style route changes

### 6. Copies the link safely

Clipboard behavior is handled like this:

- use `GM_setClipboard()` when the userscript manager provides it
- otherwise fall back to `navigator.clipboard.writeText()`

If copying succeeds, the button flashes `Copied`. If it fails, it flashes `Failed` and logs the error in the console.

## Technical Notes

- The script is wrapped in an IIFE and uses strict mode.
- It avoids duplicate processing by marking tiles with a custom attribute.
- Event handling is delegated at the document level, so buttons added later still work.
- It prevents click-through behavior on the button by stopping pointer, mouse, touch, and click events in the capture phase.
- It cleans up injected buttons and markers when navigating away from profile pages.

## Metadata

The userscript header currently includes:

- `@name`: TikTok Profile Grid Copy Link Button
- `@version`: 1.0
- `@match`: `https://www.tiktok.com/@*`
- `@grant`: `GM_setClipboard`
- `@run-at`: `document-idle`
- `@license`: MIT

## Limitations

- It depends on TikTok's current DOM structure and selectors. If TikTok changes those, the script may break.
- Clipboard fallback may fail in environments where `navigator.clipboard` is restricted.
- The button is only added on profile grid pages, not inside the single-post viewer or other TikTok views.

## License

MIT
