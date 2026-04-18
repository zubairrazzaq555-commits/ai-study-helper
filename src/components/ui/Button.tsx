import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variants = {
      primary:
        "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-900/30 glow-accent-hover",
      secondary:
        "bg-white/8 hover:bg-white/12 active:bg-white/6 text-white border border-white/10 hover:border-white/20",
      ghost: "hover:bg-white/6 text-zinc-400 hover:text-white",
      danger: "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20",
      outline:
        "border border-indigo-500/40 hover:border-indigo-500/70 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10",
    };

    const sizes = {
      sm: "px-3.5 py-1.5 text-xs h-8",
      md: "px-5 py-2.5 text-sm h-10",
      lg: "px-7 py-3.5 text-base h-12",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export default Button;
