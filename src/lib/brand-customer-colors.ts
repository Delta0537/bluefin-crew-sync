import { cn } from "@/lib/utils";

/**
 * Customer / project striping for schedule views — derived from GATE Energy /
 * BlueFin brand colors (navy, lime, sky) so bars stay on-brand vs generic rainbow.
 */
const BRAND_CUSTOMER_PALETTE: {
  bg: string;
  bar: string;
  text: string;
  ring: string;
}[] = [
  { bg: "bg-brand-sky/15", bar: "bg-brand-sky", text: "text-brand-navy dark:text-brand-sky", ring: "ring-brand-sky/40" },
  { bg: "bg-brand-lime/18", bar: "bg-brand-lime", text: "text-brand-navy dark:text-brand-lime", ring: "ring-brand-lime/45" },
  { bg: "bg-brand-navy/10", bar: "bg-brand-navy", text: "text-brand-navy dark:text-brand-sky", ring: "ring-brand-navy/35" },
  { bg: "bg-brand-sky/10", bar: "bg-brand-lime", text: "text-brand-navy dark:text-brand-lime", ring: "ring-brand-sky/35" },
  { bg: "bg-brand-lime/12", bar: "bg-brand-sky", text: "text-brand-navy dark:text-brand-sky", ring: "ring-brand-lime/35" },
  { bg: "bg-brand-sky/20", bar: "bg-brand-navy", text: "text-brand-navy dark:text-brand-sky", ring: "ring-brand-navy/30" },
  { bg: "bg-brand-navy/8", bar: "bg-brand-sky", text: "text-brand-navy dark:text-brand-sky", ring: "ring-brand-sky/30" },
  { bg: "bg-brand-lime/25", bar: "bg-brand-navy", text: "text-brand-navy dark:text-brand-lime", ring: "ring-brand-navy/25" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function customerBrandStripes(name: string | null | undefined) {
  const key = (name ?? "").trim() || "Unassigned";
  return BRAND_CUSTOMER_PALETTE[hashString(key) % BRAND_CUSTOMER_PALETTE.length];
}

/** Compact cell chips (EOB grid) — background + text using same hash. */
export function customerBrandCellClasses(name: string | null | undefined) {
  const c = customerBrandStripes(name);
  return cn(
    "max-w-full truncate rounded-sm px-0.5 text-[9px] font-semibold transition-colors",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "hover:ring-2",
    c.bg,
    c.text,
    c.ring,
  );
}
