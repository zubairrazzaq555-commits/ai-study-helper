import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
  variant?: "default" | "elevated" | "ghost";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover, glow, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-zinc-900/60 border border-white/7",
      elevated: "bg-zinc-800/60 border border-white/10",
      ghost: "border border-white/5",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl",
          variants[variant],
          hover && "card-hover cursor-pointer",
          glow && "hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pb-0", className)} {...props} />
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0 flex items-center", className)} {...props} />
);

export default Card;
