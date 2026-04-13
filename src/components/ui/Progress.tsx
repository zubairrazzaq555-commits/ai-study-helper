import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: "indigo" | "violet" | "emerald" | "amber";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export default function Progress({
  value,
  max = 100,
  className,
  color = "indigo",
  size = "md",
  animated = false,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    indigo: "bg-gradient-to-r from-indigo-600 to-indigo-400",
    violet: "bg-gradient-to-r from-violet-600 to-violet-400",
    emerald: "bg-gradient-to-r from-emerald-600 to-emerald-400",
    amber: "bg-gradient-to-r from-amber-600 to-amber-400",
  };

  const sizes = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2.5",
  };

  return (
    <div className={cn("w-full bg-zinc-800 rounded-full overflow-hidden", sizes[size], className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700 ease-out",
          colors[color],
          animated && "shimmer"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
