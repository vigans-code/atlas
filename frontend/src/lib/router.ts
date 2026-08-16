import { useLocation } from "react-router-dom";

export function usePathname() {
  return useLocation().pathname;
}

export function navigate(to: string) {
  const current = window.location.hash.replace(/^#/, "") || "/";
  if (current !== to) window.location.hash = to;
}
