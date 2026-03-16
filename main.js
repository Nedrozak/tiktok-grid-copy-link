// ==UserScript==
// @name         TikTok Profile Grid Copy Link Button
// @namespace    https://greasyfork.org/en/users/1580781-nedrozak
// @version      1.0
// @description  Adds a lightweight copy link button to TikTok profile grid items for video and photo posts
// @author       Nedrozak
// @license      MIT
// @match        https://www.tiktok.com/@*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const PROFILE_PATH_RE = /^\/@[^/]+\/?$/;
  const GRID_SELECTOR = "#user-post-item-list";
  const ITEM_SELECTOR = 'div[data-e2e="user-post-item"]';
  const LINK_SELECTOR = 'a[href*="/video/"], a[href*="/photo/"]';
  const BUTTON_CLASS = "tm-tiktok-copy-link-btn";
  const STYLE_ID = "tm-tiktok-copy-link-style";
  const TILE_MARK_ATTR = "data-tm-copy-ready";
  const BUTTON_URL_ATTR = "data-tm-copy-url";

  let gridObserver = null;
  let pageObserver = null;
  let activeGrid = null;
  let currentUrl = location.pathname + location.search;

  function isProfilePage() {
    return PROFILE_PATH_RE.test(location.pathname);
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
            ${ITEM_SELECTOR} {
                position: relative !important;
            }

            .${BUTTON_CLASS} {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 20;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                border: 0;
                border-radius: 999px;
                padding: 7px 10px;
                font: 700 12px/1 sans-serif;
                color: #fff;
                background: rgba(0, 0, 0, 0.78);
                cursor: pointer;
                opacity: 0;
                transform: translateY(-2px);
                transition: opacity 0.15s ease, transform 0.15s ease, background 0.15s ease;
                pointer-events: auto;
            }

            ${ITEM_SELECTOR}:hover .${BUTTON_CLASS},
            .${BUTTON_CLASS}.tm-show {
                opacity: 1;
                transform: translateY(0);
            }

            .${BUTTON_CLASS}:hover {
                background: rgba(0, 0, 0, 0.92);
            }

            .${BUTTON_CLASS}.tm-copied {
                background: rgba(20, 130, 60, 0.95);
            }

            .${BUTTON_CLASS} svg {
                width: 14px;
                height: 14px;
                display: block;
                flex: 0 0 auto;
                fill: currentColor;
            }
        `;
    document.head.appendChild(style);
  }

  function normalizeTikTokUrl(url) {
    try {
      const u = new URL(url, location.origin);
      u.search = "";
      u.hash = "";
      return u.toString();
    } catch {
      return url;
    }
  }

  async function copyText(text) {
    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(text);
      return;
    }

    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API unavailable");
    }

    await navigator.clipboard.writeText(text);
  }

  function flashButton(button, label, copied) {
    const textNode = button.querySelector(".tm-copy-label");
    if (textNode) textNode.textContent = label;

    button.classList.add("tm-show");
    button.classList.toggle("tm-copied", !!copied);

    clearTimeout(button._tmTimer);
    button._tmTimer = setTimeout(() => {
      if (textNode) textNode.textContent = "Copy";
      button.classList.remove("tm-show", "tm-copied");
    }, 1200);
  }

  function createButton(url) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.setAttribute("aria-label", "Copy post link");
    button.setAttribute(BUTTON_URL_ATTR, url);
    button.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h1v-2H9a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h2V6a3 3 0 0 0-3-3H9zm6 6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3h-4zm0 2h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z"></path>
            </svg>
            <span class="tm-copy-label">Copy</span>
        `;
    return button;
  }

  function getTileUrl(tile) {
    const link = tile.querySelector(LINK_SELECTOR);
    if (!link || !link.href) return null;
    return normalizeTikTokUrl(link.href);
  }

  function processTile(tile) {
    if (!tile || tile.nodeType !== 1) return;
    const url = getTileUrl(tile);
    if (!url) return;

    let button = tile.querySelector(`.${BUTTON_CLASS}`);
    if (!button) {
      button = createButton(url);
      tile.appendChild(button);
      tile.setAttribute(TILE_MARK_ATTR, "1");
      return;
    }

    button.setAttribute(BUTTON_URL_ATTR, url);
    tile.setAttribute(TILE_MARK_ATTR, "1");
  }

  function processExistingTiles(grid) {
    const tiles = grid.querySelectorAll(
      `${ITEM_SELECTOR}:not([${TILE_MARK_ATTR}="1"])`,
    );
    for (const tile of tiles) processTile(tile);
  }

  function disconnectGridObserver() {
    if (gridObserver) {
      gridObserver.disconnect();
      gridObserver = null;
    }
    activeGrid = null;
  }

  function observeGrid(grid) {
    if (!grid || grid === activeGrid) return;

    disconnectGridObserver();
    activeGrid = grid;

    processExistingTiles(grid);

    gridObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!node || node.nodeType !== 1) continue;

          if (node.matches && node.matches(ITEM_SELECTOR)) {
            processTile(node);
            continue;
          }

          if (node.querySelectorAll) {
            const tiles = node.querySelectorAll(ITEM_SELECTOR);
            for (const tile of tiles) processTile(tile);
          }
        }
      }
    });

    gridObserver.observe(grid, {
      childList: true,
      subtree: true,
    });
  }

  function removeButtons() {
    disconnectGridObserver();
    document
      .querySelectorAll(`.${BUTTON_CLASS}`)
      .forEach((btn) => btn.remove());
    document.querySelectorAll(`[${TILE_MARK_ATTR}="1"]`).forEach((tile) => {
      tile.removeAttribute(TILE_MARK_ATTR);
    });
  }

  function syncPageState() {
    if (!isProfilePage()) {
      removeButtons();
      return;
    }

    const grid = document.querySelector(GRID_SELECTOR);
    if (grid) {
      observeGrid(grid);
    }
  }

  function setupPageObserver() {
    if (pageObserver) return;

    pageObserver = new MutationObserver(() => {
      if (!isProfilePage()) return;
      if (activeGrid && document.contains(activeGrid)) return;

      const grid = document.querySelector(GRID_SELECTOR);
      if (grid) observeGrid(grid);
    });

    pageObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function onRouteChange() {
    const nextUrl = location.pathname + location.search;
    if (nextUrl === currentUrl) return;
    currentUrl = nextUrl;
    syncPageState();
  }

  function patchHistory() {
    if (window.__tmTikTokCopyHistoryPatched) return;
    window.__tmTikTokCopyHistoryPatched = true;

    const { pushState, replaceState } = history;

    history.pushState = function (...args) {
      const result = pushState.apply(this, args);
      onRouteChange();
      return result;
    };

    history.replaceState = function (...args) {
      const result = replaceState.apply(this, args);
      onRouteChange();
      return result;
    };

    window.addEventListener("popstate", onRouteChange, { passive: true });
  }

  function setupDelegatedClickHandler() {
    document.addEventListener(
      "click",
      async (event) => {
        const button = event.target.closest(`.${BUTTON_CLASS}`);
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const url = button.getAttribute(BUTTON_URL_ATTR);
        if (!url) return;

        try {
          await copyText(url);
          flashButton(button, "Copied", true);
        } catch (err) {
          console.error("Failed to copy TikTok link:", err);
          flashButton(button, "Failed", false);
        }
      },
      true,
    );

    const stop = (event) => {
      const button = event.target.closest(`.${BUTTON_CLASS}`);
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    document.addEventListener("pointerdown", stop, true);
    document.addEventListener("mousedown", stop, true);
    document.addEventListener("touchstart", stop, {
      capture: true,
      passive: false,
    });
  }

  function init() {
    injectStyles();
    patchHistory();
    setupDelegatedClickHandler();
    setupPageObserver();
    syncPageState();
  }

  init();
})();
