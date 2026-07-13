import { useEffect } from 'react';
import { SFX } from '@/lib/sfx';

type Dir = 'up' | 'down' | 'left' | 'right';

const SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  '[data-focusable="true"]',
].join(', ');

const KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

const CODE_TO_DIR: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

const KEYCODE_TO_DIR: Record<number, Dir> = {
  38: 'up',
  40: 'down',
  37: 'left',
  39: 'right',
  19: 'up',
  20: 'down',
  21: 'left',
  22: 'right',
  87: 'up',
  83: 'down',
  65: 'left',
  68: 'right',
};

const CENTER_KEYCODES = new Set([13, 23, 32]);
const BACK_KEYCODES = new Set([27, 4, 461, 10009, 166]);
const BACK_KEYS = new Set(['Escape', 'Esc', 'BrowserBack', 'GoBack', 'Back']);

const MODAL_SELECTOR = '[role="dialog"], [aria-modal="true"]';

const LOCAL_KEYBOARD_SELECTOR = [
  '[role="listbox"]',
  '[role="menu"]',
  '[role="grid"]',
  '[role="tree"]',
  '[role="tablist"]',
].join(', ');

const AXIS_TOLERANCE = 24;

let activeSearchEditEl: HTMLElement | null = null;
let lastFocusedEl: HTMLElement | null = null;
let focusStylesInjected = false;

function isEditable(el: HTMLElement | null) {
  if (!el) return false;

  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

function isSearchLikeField(el: HTMLElement | null) {
  if (!el) return false;

  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    return false;
  }

  const type = (el.getAttribute('type') || '').toLowerCase();
  const role = (el.getAttribute('role') || '').toLowerCase();
  const inputMode = (el.getAttribute('inputmode') || '').toLowerCase();
  const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
  const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
  const name = (el.getAttribute('name') || '').toLowerCase();

  return (
    type === 'search' ||
    role === 'searchbox' ||
    inputMode === 'search' ||
    ariaLabel.includes('search') ||
    placeholder.includes('search') ||
    placeholder.includes('بحث') ||
    name.includes('search') ||
    name.includes('query')
  );
}

function isHomeSearch(el: HTMLElement | null) {
  return !!el?.closest('[data-tv-direct-edit="true"]');
}

function isVisible(el: HTMLElement) {
  if (!el.isConnected) return false;
  if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;

  const style = window.getComputedStyle(el);

  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    parseFloat(style.opacity) === 0
  ) {
    return false;
  }

  const rect = el.getBoundingClientRect();

  return rect.width > 0 && rect.height > 0 && el.getClientRects().length > 0;
}

function isInNav(el: HTMLElement) {
  return !!el.closest('[data-harbor-nav]');
}

function zoneOf(el: HTMLElement): 'nav' | 'hero' | 'content' {
  if (isInNav(el)) return 'nav';
  if (el.closest('[data-tv-hero-zone]')) return 'hero';

  return 'content';
}

function getFocusable(root: ParentNode = document) {
  const all = Array.from(root.querySelectorAll<HTMLElement>(SELECTOR)).filter(
    isVisible,
  );

  return all.filter(
    (el) => !all.some((other) => other !== el && other.contains(el)),
  );
}

function getFocusableInZone(
  zone: 'nav' | 'hero' | 'content',
  root: ParentNode = document,
) {
  return getFocusable(root).filter((el) => zoneOf(el) === zone);
}

function getNavCandidates(root: ParentNode = document) {
  return getFocusable(root).filter(isInNav);
}

function getRect(el: HTMLElement) {
  const r = el.getBoundingClientRect();

  return {
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
  };
}

function overlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function findClosestByY(
  from: HTMLElement,
  candidates: HTMLElement[],
): HTMLElement | null {
  const src = getRect(from);

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of candidates) {
    if (el === from) continue;

    const dst = getRect(el);
    const score = Math.abs(dst.cy - src.cy) * 10 + Math.abs(dst.cx - src.cx);

    if (score < bestScore) {
      best = el;
      bestScore = score;
    }
  }

  return best;
}

function hasLeftNeighborInRow(
  active: HTMLElement,
  root: ParentNode = document,
) {
  const src = getRect(active);

  return getFocusable(root)
    .filter((el) => el !== active && !isInNav(el))
    .some((el) => {
      const dst = getRect(el);
      const sameRow =
        Math.abs(dst.cy - src.cy) < Math.max(24, src.height * 0.6);

      return sameRow && dst.cx < src.cx - 8;
    });
}

function getActiveModal(target: HTMLElement | null) {
  const owned = target?.closest<HTMLElement>(MODAL_SELECTOR);

  if (owned && isVisible(owned)) return owned;

  const modals = Array.from(
    document.querySelectorAll<HTMLElement>(MODAL_SELECTOR),
  ).filter(isVisible);

  return modals[modals.length - 1] ?? null;
}

function ensureFocusStyles() {
  if (focusStylesInjected || typeof document === 'undefined') return;

  focusStylesInjected = true;

  const style = document.createElement('style');
  style.setAttribute('data-tv-focus-styles', 'true');

  style.textContent = `
    [data-tv-focused="true"]:not([data-search-editing="true"]) {
      outline: none !important;
      box-shadow:
        0 0 0 4px var(--tv-focus-ring, #ff8a00),
        0 0 0 8px rgba(255, 138, 0, 0.30) !important;
      transition: box-shadow 120ms ease;
      z-index: 20;
      position: relative;
    }

    [data-search-editing="true"] {
      outline: none !important;
      border-color: #ffffff !important;
      box-shadow:
        0 0 0 3px #ffffff,
        0 0 0 7px rgba(255, 255, 255, 0.45),
        0 0 18px rgba(255, 255, 255, 0.35) !important;
      background-color: rgba(255, 255, 255, 0.08) !important;
      transition: box-shadow 120ms ease, border-color 120ms ease !important;
    }
  `;

  document.head.appendChild(style);
}

function isLocallyManaged(target: HTMLElement | null) {
  return !!target?.closest(LOCAL_KEYBOARD_SELECTOR);
}

function getDirection(e: KeyboardEvent): Dir | null {
  if (KEY_TO_DIR[e.key]) return KEY_TO_DIR[e.key];
  if (CODE_TO_DIR[e.code]) return CODE_TO_DIR[e.code];

  return KEYCODE_TO_DIR[e.keyCode] ?? null;
}

function isBackKey(e: KeyboardEvent) {
  return BACK_KEYS.has(e.key) || BACK_KEYCODES.has(e.keyCode);
}

function getInitialFocus(list: HTMLElement[]) {
  return (
    list.find((el) => el.hasAttribute('data-tv-initial-focus')) ??
    list[0] ??
    null
  );
}

function enterSearchEditMode(el: HTMLElement) {
  ensureFocusStyles();

  if (activeSearchEditEl && activeSearchEditEl !== el) {
    activeSearchEditEl.removeAttribute('data-search-editing');
  }

  if (lastFocusedEl && lastFocusedEl !== el) {
    lastFocusedEl.removeAttribute('data-tv-focused');
  }

  activeSearchEditEl = el;
  lastFocusedEl = el;

  el.setAttribute('data-tv-focused', 'true');
  el.setAttribute('data-search-editing', 'true');
  el.focus({ preventScroll: true });
}

function focusElement(el: HTMLElement) {
  ensureFocusStyles();

  if (lastFocusedEl && lastFocusedEl !== el) {
    lastFocusedEl.removeAttribute('data-tv-focused');
  }

  if (activeSearchEditEl && activeSearchEditEl !== el) {
    activeSearchEditEl.removeAttribute('data-search-editing');
    activeSearchEditEl = null;
  }

  el.setAttribute('data-tv-focused', 'true');
  lastFocusedEl = el;

  el.focus({ preventScroll: true });

  el.scrollIntoView({
    block: 'center',
    inline: 'center',
    behavior: 'smooth',
  });

  if (isSearchLikeField(el) && isHomeSearch(el)) {
    enterSearchEditMode(el);
  }
}

function exitSearchEditMode() {
  if (!activeSearchEditEl) return;

  const el = activeSearchEditEl;
  activeSearchEditEl = null;

  el.removeAttribute('data-search-editing');

  if (isHomeSearch(el)) {
    el.removeAttribute('data-tv-focused');

    if (lastFocusedEl === el) {
      lastFocusedEl = null;
    }

    el.blur();
    return;
  }

  focusElement(el);
}

function exitNavigationMode() {
  if (activeSearchEditEl) {
    activeSearchEditEl.removeAttribute('data-search-editing');
    activeSearchEditEl = null;
  }

  if (lastFocusedEl) {
    lastFocusedEl.removeAttribute('data-tv-focused');
    lastFocusedEl = null;
  }

  const active =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  active?.blur();
}

function findBest(
  focused: HTMLElement,
  candidates: HTMLElement[],
  dir: Dir,
) {
  const src = getRect(focused);

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of candidates) {
    if (el === focused) continue;

    const dst = getRect(el);

    if (dir === 'right' && dst.cx <= src.cx + AXIS_TOLERANCE) continue;
    if (dir === 'left' && dst.cx >= src.cx - AXIS_TOLERANCE) continue;
    if (dir === 'down' && dst.cy <= src.cy + AXIS_TOLERANCE) continue;
    if (dir === 'up' && dst.cy >= src.cy - AXIS_TOLERANCE) continue;

    const horizontal = dir === 'left' || dir === 'right';

    const primary =
      dir === 'right'
        ? Math.max(0, dst.left - src.right)
        : dir === 'left'
          ? Math.max(0, src.left - dst.right)
          : dir === 'down'
            ? Math.max(0, dst.top - src.bottom)
            : Math.max(0, src.top - dst.bottom);

    const secondary = horizontal
      ? Math.abs(dst.cy - src.cy)
      : Math.abs(dst.cx - src.cx);

    const axisOverlap = horizontal
      ? overlap(src.top, src.bottom, dst.top, dst.bottom)
      : overlap(src.left, src.right, dst.left, dst.right);

    const score =
      primary * 10 +
      secondary * 3 -
      (axisOverlap > 0 ? axisOverlap * 10 : 0);

    if (score < bestScore) {
      best = el;
      bestScore = score;
    }
  }

  return best;
}

function getSpatialOrder(list: HTMLElement[]) {
  return [...list].sort((a, b) => {
    const ra = getRect(a);
    const rb = getRect(b);

    if (Math.abs(ra.top - rb.top) > 8) {
      return ra.top - rb.top;
    }

    return ra.left - rb.left;
  });
}

type TVNavigationOptions = {
  enabled?: boolean;
  wrap?: boolean;
  onBack?: () => boolean;
  onBackToNav?: () => void;
};

export function useKeyboardNavigation(options: TVNavigationOptions = {}) {
  const {
    enabled = true,
    wrap = true,
    onBack,
    onBackToNav,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
    
      if (target && isSearchLikeField(target)) {
        enterSearchEditMode(target);
        return;
      }
    
      exitNavigationMode();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;

      const target = e.target instanceof HTMLElement ? e.target : null;

      const active =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      const activeModal = getActiveModal(target);

      const isEditingSearch =
        activeSearchEditEl !== null &&
        activeSearchEditEl === active;

        if (isBackKey(e) && isEditingSearch) {
          e.preventDefault();
          e.stopPropagation();
        
          SFX.close();
        
          const isHomeSearch = !!activeSearchEditEl?.closest(
            '.harbor-search-overlay',
          );
        
          if (isHomeSearch) {
            window.dispatchEvent(new Event('harbor:close-search'));
          } else {
            exitSearchEditMode();
          }
        
          return;
        }

      if (isLocallyManaged(target) || isEditingSearch) return;

      const dir = getDirection(e);
      const navigationIsActive = lastFocusedEl !== null;

      if (!navigationIsActive && !activeSearchEditEl) {
        if (!dir) return;

        e.preventDefault();
        e.stopPropagation();

        const root = activeModal ?? document;
        const first = getInitialFocus(getFocusableInZone('content', root));

        if (first) {
          SFX.navigate(dir);
          focusElement(first);
        }

        return;
      }

      if (isBackKey(e)) {
        SFX.close();

        if (activeModal) return;

        const backBtn = document.querySelector<HTMLElement>(
          [
            'button[aria-label*="back" i]',
            'button[aria-label*="رجوع" i]',
            'a[aria-label*="back" i]',
            'button[class*="back" i]',
            '[data-harbor-back]',
          ].join(', '),
        );

        if (backBtn && isVisible(backBtn)) {
          e.preventDefault();
          e.stopPropagation();
          backBtn.click();
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        const handled = onBack ? onBack() : false;

        if (!handled) {
          if (onBackToNav) {
            onBackToNav();
          } else {
            const nav = document.querySelector<HTMLElement>(
              [
                '[data-harbor-nav] [data-focusable="true"]',
                '[data-harbor-nav] a[href]',
                '[data-harbor-nav] button',
              ].join(', '),
            );

            if (nav && document.activeElement !== nav) {
              focusElement(nav);
            }
          }
        }

        return;
      }

      if (isEditable(target) && !isSearchLikeField(target)) return;

      if (dir) {
        e.preventDefault();
        e.stopPropagation();

        const root = activeModal ?? document;

        if (active && dir === 'left' && !isInNav(active)) {
          if (!hasLeftNeighborInRow(active, root)) {
            const navItems = getNavCandidates(root);
            const targetNav = findClosestByY(active, navItems);

            if (targetNav) {
              SFX.navigate(dir);
              focusElement(targetNav);
              return;
            }
          }
        }

        if (active && dir === 'right' && isInNav(active)) {
          const contentItems = getFocusable(root).filter(
            (el) => !isInNav(el),
          );

          const targetContent = findClosestByY(active, contentItems);

          if (targetContent) {
            SFX.navigate(dir);
            focusElement(targetContent);
            return;
          }
        }

        const zone = active ? zoneOf(active) : 'content';
        const all = getFocusableInZone(zone, root);

        if (!all.length) return;

        if (!active || !all.includes(active)) {
          const first = getInitialFocus(all);

          if (first) {
            SFX.navigate(dir);
            focusElement(first);
          }

          return;
        }

        if (zone === 'hero' && (dir === 'up' || dir === 'down')) {
          if (dir === 'down') {
            const first = getInitialFocus(
              getFocusableInZone('content', root),
            );

            if (first) {
              SFX.navigate(dir);
              focusElement(first);
            }
          }

          return;
        }

        const best = findBest(active, all, dir);

        if (best) {
          SFX.navigate(dir);
          focusElement(best);
          return;
        }

        if (wrap) {
          const ordered = getSpatialOrder(all);
          const index = ordered.indexOf(active);

          if (index >= 0) {
            const next =
              dir === 'down' || dir === 'right'
                ? ordered[index + 1] ?? ordered[0]
                : ordered[index - 1] ?? ordered[ordered.length - 1];

            if (next) {
              SFX.navigate(dir);
              focusElement(next);
            }
          }
        }

        return;
      }

      const isCenter =
        CENTER_KEYCODES.has(e.keyCode) ||
        e.key === 'Enter' ||
        e.code === 'Enter' ||
        e.key === ' ' ||
        e.code === 'Space';

      if (!isCenter) return;

      const currentActive =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (!currentActive) return;

      if (isSearchLikeField(currentActive)) {
        e.preventDefault();
        e.stopPropagation();

        SFX.open();
        enterSearchEditMode(currentActive);

        return;
      }

      if (isEditable(currentActive)) return;

      e.preventDefault();
      e.stopPropagation();

      currentActive.click();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', onPointerDown, true);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [enabled, wrap, onBack, onBackToNav]);
}
