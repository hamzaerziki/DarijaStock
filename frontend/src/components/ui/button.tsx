import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:pointer-events-none disabled:bg-[#EDF2F7] disabled:text-[#94A3B8] disabled:opacity-100",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-hover active:bg-primary-active",
        navy: "bg-navy text-white hover:bg-navy-800 active:bg-navy-900",
        outline: "border border-[#CFE3E0] bg-white text-primary hover:bg-primary-tint active:bg-primary-soft",
        ghost: "text-slate-600 hover:bg-[#EDF4F8] hover:text-slate-900",
        destructive: "bg-danger text-white hover:bg-[#BD3434] active:bg-[#A62D2D]",
        success: "bg-success text-white hover:bg-[#0F7A5C] active:bg-[#0C6650]",
        subtle: "bg-primary-soft text-primary hover:bg-primary-soft/70",
      },
      size: {
        default: "h-[42px] px-[18px]",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-[42px] w-[42px] px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export { buttonVariants };
