import { useSyncExternalStore } from "react";

const NAVIGATION_EVENT = "atlas:navigate";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener(NAVIGATION_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener(NAVIGATION_EVENT, onStoreChange);
  };
}

function getPathname() {
  if (window.atlasDesktop) return window.location.hash.replace(/^#/, "") || "/";
  return window.location.pathname;
}

export function usePathname() {
  return useSyncExternalStore(subscribe, getPathname, () => "/");
}

export function navigate(to: string) {
  if (window.atlasDesktop) {
    if (getPathname() !== to) window.location.hash = to;
    return;
  }
  if (getPathname() !== to) {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new Event(NAVIGATION_EVENT));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
