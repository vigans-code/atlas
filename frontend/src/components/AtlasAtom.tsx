interface AtlasAtomProps {
  size?: number;
  className?: string;
  decorative?: boolean;
}

export function AtlasAtom({ size = 32, className = "", decorative = true }: AtlasAtomProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Atlas"}
      role={decorative ? undefined : "img"}
    >
      <g className="atlas-atom-orbits" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <ellipse cx="32" cy="32" rx="25" ry="10.5" transform="rotate(27 32 32)" strokeDasharray="55 11" />
        <ellipse cx="32" cy="32" rx="25" ry="10.5" transform="rotate(-27 32 32)" strokeDasharray="47 10 9 10" />
        <ellipse cx="32" cy="32" rx="24" ry="9.5" transform="rotate(90 32 32)" strokeDasharray="35 12 10 12" />
      </g>
      <path d="M32 24.2 39 28v8L32 39.8 25 36v-8l7-3.8Z" fill="currentColor" />
      <circle cx="52.5" cy="20.5" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function AtlasLoader({ label = "Loading Atlas" }: { label?: string }) {
  return <div className="flex flex-col items-center gap-3" role="status" aria-label={label}><AtlasAtom size={34} className="atlas-atom-loader text-[var(--atlas-accent)]" /><span className="text-xs text-[var(--atlas-subtle)]">{label}</span></div>;
}
