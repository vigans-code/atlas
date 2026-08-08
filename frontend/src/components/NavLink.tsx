import { type MouseEvent, type ReactNode } from "react";

import { navigate, usePathname } from "../lib/router";

interface NavLinkState {
  isActive: boolean;
}

interface NavLinkProps {
  to: string;
  end?: boolean;
  title?: string;
  className?: string | ((state: NavLinkState) => string);
  children: ReactNode | ((state: NavLinkState) => ReactNode);
}

export function NavLink({ to, end = false, title, className, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const state = { isActive };

  const followLink = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  };

  return (
    <a
      href={window.atlasDesktop ? `#${to}` : to}
      title={title}
      aria-current={isActive ? "page" : undefined}
      className={typeof className === "function" ? className(state) : className}
      onClick={followLink}
    >
      {typeof children === "function" ? children(state) : children}
    </a>
  );
}
