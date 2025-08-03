"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    variant?: 'default' | 'success' | 'warning' | 'error';
  }
>(({ className, value, variant = 'default', ...props }, ref) => {
  // ✅ PRINCIPAL ENGINEER: Enhanced progress variants for enterprise design
  const variantStyles = {
    default: "bg-gradient-to-r from-blue-500 to-emerald-500",
    success: "bg-gradient-to-r from-green-500 to-emerald-500", 
    warning: "bg-gradient-to-r from-amber-500 to-orange-500",
    error: "bg-gradient-to-r from-red-500 to-pink-500",
  };

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full",
        "bg-gray-200 dark:bg-gray-700", // ✅ Improved light/dark mode support
        "transition-all duration-300 ease-in-out",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all duration-500 ease-out",
          "shadow-sm", // ✅ Subtle shadow for depth
          variantStyles[variant]
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
      {/* ✅ ENTERPRISE: Progress glow effect for enhanced visual appeal */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full opacity-20",
          "bg-gradient-to-r from-transparent via-white to-transparent",
          "animate-pulse duration-2000"
        )}
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          width: `${Math.min((value || 0) + 10, 100)}%`
        }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
