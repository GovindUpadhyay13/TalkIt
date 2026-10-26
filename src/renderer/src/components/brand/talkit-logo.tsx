import { cn } from "@/lib/utils";

/**
 * TalkIt folded-ribbon T-shaped symbol with vertical sound-wave bars.
 * Clean vector SVG adhering strictly to the Obsidian Lime palette:
 * - Rounded, folded-ribbon T symbol
 * - Vertical sound-wave bars representing voice interaction
 * - Dark charcoal surfaces with subtle lime green glow (#C5F467)
 */
export function TalkItSymbol({
  className,
  size = 24,
  active = false,
}: {
  className?: string;
  size?: number;
  active?: boolean;
}) {
  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "h-full w-full transition-all duration-300",
          active && "filter drop-shadow-[0_0_8px_rgba(197,244,103,0.45)]",
        )}
      >
        {/* Background rounded container */}
        <rect width="32" height="32" rx="8" fill="#181f18" stroke="#343D34" strokeWidth="1" />

        {/* Folded-ribbon T symbol */}
        {/* Horizontal top bar with rounded fold */}
        <path
          d="M7 10C7 8.89543 7.89543 8 9 8H23C24.1046 8 25 8.89543 25 10C25 11.1046 24.1046 12 23 12H9C7.89543 12 7 11.1046 7 10Z"
          fill="#8AA89A"
        />
        {/* Top fold overlay with primary lime accent */}
        <path
          d="M13 8H23C24.1046 8 25 8.89543 25 10C25 11.1046 24.1046 12 23 12H17L13 8Z"
          fill="#C5F467"
        />
        {/* Vertical T stem */}
        <rect x="14" y="11" width="4" height="13" rx="2" fill="#F2F5ED" />

        {/* Vertical sound-wave bars representing voice interaction */}
        <rect
          x="3.5"
          y="12"
          width="1.8"
          height="8"
          rx="0.9"
          fill="#C5F467"
          className={active ? "animate-pulse" : "opacity-80"}
        />
        <rect
          x="26.7"
          y="12"
          width="1.8"
          height="8"
          rx="0.9"
          fill="#C5F467"
          className={active ? "animate-pulse" : "opacity-80"}
        />
      </svg>
    </div>
  );
}

/**
 * TalkIt Wordmark:
 * "Talk" in off-white (#F2F5ED) and "It" in lime green (#C5F467).
 */
export function TalkItWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClasses = {
    sm: "text-xs tracking-wide",
    md: "text-sm tracking-tight",
    lg: "text-lg tracking-tight",
    xl: "text-2xl font-semibold tracking-tight",
  };

  return (
    <span className={cn("inline-flex items-baseline font-semibold select-none", sizeClasses[size], className)}>
      <span className="text-[#F2F5ED]">Talk</span>
      <span className="text-[#C5F467] font-bold">It</span>
    </span>
  );
}

/**
 * Combined TalkIt brand lockup with symbol and wordmark.
 */
export function TalkItBrand({
  className,
  symbolSize = 22,
  textSize = "md",
  active = false,
}: {
  className?: string;
  symbolSize?: number;
  textSize?: "sm" | "md" | "lg" | "xl";
  active?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2 select-none", className)}>
      <TalkItSymbol size={symbolSize} active={active} />
      <TalkItWordmark size={textSize} />
    </div>
  );
}
