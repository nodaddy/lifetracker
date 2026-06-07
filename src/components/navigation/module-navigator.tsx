"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ModuleId = "routine" | "financial" | "professional";

const MODULES: {
  id: ModuleId;
  href: string;
  label: string;
}[] = [
  { id: "routine", href: "/dashboard/daily-routine", label: "Daily Routine" },
  { id: "financial", href: "/dashboard/financial-life", label: "Financial Life" },
  { id: "professional", href: "/dashboard/professional-life", label: "Professional Life" },
];

function resolveActiveModule(pathname: string): ModuleId {
  if (pathname.startsWith("/dashboard/financial-life")) {
    return "financial";
  }
  if (pathname.startsWith("/dashboard/professional-life")) {
    return "professional";
  }
  return "routine";
}

function ModuleIcon({ module, size }: { module: ModuleId; size: "lg" | "sm" }) {
  const isLarge = size === "lg";

  if (module === "financial") {
    return (
      <span
        className={`relative bg-gradient-to-br from-cyan-100 via-white to-cyan-300 bg-clip-text font-semibold leading-none text-transparent drop-shadow-[0_0_6px_rgba(46,242,255,0.55)] ${
          isLarge ? "translate-y-[1px] text-[1.45rem]" : "translate-y-px text-base"
        }`}
        aria-hidden="true"
      >
        ₹
      </span>
    );
  }

  const iconClass = isLarge ? "h-[22px] w-[22px]" : "h-[17px] w-[17px]";

  if (module === "routine") {
    return (
      <svg
        className={`${iconClass} text-cyan-100 drop-shadow-[0_0_6px_rgba(46,242,255,0.45)]`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      className={`${iconClass} text-cyan-200 drop-shadow-[0_0_4px_rgba(46,242,255,0.45)]`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 12v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function NavOrb({
  module,
  size,
  className = "",
}: {
  module: ModuleId;
  size: "lg" | "sm";
  className?: string;
}) {
  const isLarge = size === "lg";

  return (
    <span
      className={`relative flex items-center justify-center rounded-full border border-cyan-300/45 bg-gradient-to-br from-[#0f1f2e] via-[#0d1824] to-[#081018] shadow-[inset_0_1px_0_rgba(46,242,255,0.18),0_0_8px_rgba(46,242,255,0.28)] ${
        isLarge ? "h-14 w-14" : "h-10 w-10"
      } ${className}`}
    >
      <span
        className={`absolute inset-0 rounded-full bg-gradient-to-br from-cyan-300/80 via-cyan-400/70 to-cyan-500/60 blur-[2px] ${
          isLarge ? "" : "opacity-80"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute rounded-full border border-cyan-200/35 bg-gradient-to-br from-cyan-300/[0.08] to-transparent ${
          isLarge ? "inset-[3px]" : "inset-[2px]"
        }`}
        aria-hidden="true"
      />
      <ModuleIcon module={module} size={size} />
    </span>
  );
}

export function ModuleNavigator() {
  const pathname = usePathname();
  const isModuleRoute = MODULES.some(
    (module) => pathname === module.href || pathname.startsWith(`${module.href}/`),
  );

  if (!isModuleRoute) {
    return null;
  }

  const activeId = resolveActiveModule(pathname);
  const active = MODULES.find((module) => module.id === activeId)!;
  const inactive = MODULES.filter((module) => module.id !== activeId);

  return (
    <nav
      className="pointer-events-none fixed bottom-[50px] right-4 z-[85] sm:bottom-[58px] sm:right-6"
      aria-label="Life modules"
    >
      <div className="pointer-events-auto relative h-20 w-[4.75rem] origin-bottom-right -rotate-45">
        <div
          className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 rotate-45 transition-transform duration-300 ease-out"
          aria-current="page"
          aria-label={active.label}
        >
          <NavOrb module={active.id} size="lg" />
        </div>

        {inactive.map((module, index) => (
          <Link
            key={module.id}
            href={module.href}
            className={`absolute bottom-[2.35rem] z-30 rotate-45 transition-all duration-300 ease-out hover:scale-105 active:scale-95 ${
              index === 0 ? "right-0" : "left-0"
            }`}
            aria-label={module.label}
          >
            <NavOrb module={module.id} size="sm" />
          </Link>
        ))}
      </div>
    </nav>
  );
}
