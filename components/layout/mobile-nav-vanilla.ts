// Vanilla controller for the mobile navigation drawer.
//
// It owns the open/closed DOM truth (`data-open` on #mobile-nav-drawer) and
// attaches native listeners at bundle-evaluation time, so the hamburger menu
// works even before (or without) React hydration. React components only
// mirror this state (via the "mobile-nav:change" event) for icons/aria.
//
// Rules: exactly one writer (this module). Everything else reads.

const DRAWER_ID = "mobile-nav-drawer";
const TOGGLE_ATTR = "data-mobile-nav-toggle";
const CLOSE_ATTR = "data-mobile-nav-close";
export const MOBILE_NAV_CHANGE_EVENT = "mobile-nav:change";

function drawerEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(DRAWER_ID);
}

export function isMobileNavOpen(): boolean {
  return drawerEl()?.dataset.open === "true";
}

export function setMobileNavOpen(open: boolean): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const drawer = drawerEl();
  if (!drawer) return;
  const next = open ? "true" : "false";
  if (drawer.dataset.open !== next) {
    drawer.dataset.open = next;
  }
  const toggle = document.querySelector(`[${TOGGLE_ATTR}]`);
  toggle?.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
  (drawer as HTMLElement & { inert?: boolean }).inert = !open;
  window.dispatchEvent(new CustomEvent(MOBILE_NAV_CHANGE_EVENT));
}

export function toggleMobileNav(): void {
  setMobileNavOpen(!isMobileNavOpen());
}

function onDocumentClick(e: MouseEvent): void {
  const target = e.target as HTMLElement | null;
  if (!target || typeof target.closest !== "function") return;
  if (target.closest(`[${TOGGLE_ATTR}]`)) {
    toggleMobileNav();
    return;
  }
  if (target.closest(`[${CLOSE_ATTR}]`)) {
    setMobileNavOpen(false);
  }
}

function onDocumentKeyDown(e: KeyboardEvent): void {
  if (e.key === "Escape" && isMobileNavOpen()) setMobileNavOpen(false);
}

export function initMobileNav(): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }
  const w = window as unknown as { __mobileNavInit?: boolean };
  if (w.__mobileNavInit) return () => {};
  w.__mobileNavInit = true;
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKeyDown);
  return () => {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onDocumentKeyDown);
    w.__mobileNavInit = false;
  };
}

// Auto-attach on bundle evaluation (client only). Guarded, so HMR or
// duplicate imports never register listeners twice.
initMobileNav();
