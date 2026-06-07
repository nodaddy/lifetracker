import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
  {
    variants: {
      variant: {
        default:
          "border border-fuchsia-300/35 bg-gradient-to-b from-fuchsia-400/30 to-fuchsia-500/18 text-fuchsia-100 shadow-[0_8px_22px_rgba(255,62,165,0.22)] hover:bg-fuchsia-500/30",
        secondary:
          "border border-cyan-200/35 bg-gradient-to-b from-cyan-300/24 to-cyan-400/16 text-cyan-100 shadow-[0_8px_22px_rgba(46,242,255,0.18)] hover:bg-cyan-400/28",
        outline:
          "border border-white/20 bg-white/5 text-purple-100 hover:bg-purple-500/14 shadow-[0_8px_20px_rgba(168,85,247,0.14)]",
        ghost: "text-zinc-200 hover:bg-white/10",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-8",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
