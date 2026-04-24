"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "soft" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
  }
>(({ className, variant = "primary", size = "md", ...props }, ref) => {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-pill transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed select-none";
  const variants = {
    primary:
      "bg-blush-deep text-white shadow-[0_6px_24px_-12px_rgba(255,159,182,0.7)] hover:bg-blush-deep/90",
    soft: "bg-white text-ink border border-ink-faint/40 hover:border-ink-faint",
    ghost: "bg-transparent text-ink hover:bg-white/60",
    danger: "bg-red-400 text-white hover:bg-red-500",
  } as const;
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-12 px-6 text-base",
    lg: "h-14 px-8 text-lg",
  } as const;
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});
Button.displayName = "Button";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-card shadow-[0_12px_40px_-16px_rgba(42,36,56,0.18)] p-6",
        className,
      )}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-12 px-4 rounded-pill bg-white border border-ink-faint/40 text-ink placeholder:text-ink-faint focus:outline-none focus:border-blush-deep focus:ring-4 focus:ring-blush/40 transition w-full",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export function Pill({
  children,
  className,
  tone = "mint",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "mint" | "blush" | "lavender" | "lemon" | "sky";
}) {
  const tones = {
    mint: "bg-mint text-emerald-900",
    blush: "bg-blush text-rose-900",
    lavender: "bg-lavender text-indigo-900",
    lemon: "bg-lemon text-amber-900",
    sky: "bg-sky text-sky-900",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-bold uppercase tracking-wider",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-display", className)}>
      <span className="text-3xl">🤔</span>
      <span className="text-2xl font-bold tracking-tight">
        Second <span className="italic text-blush-deep">Guess</span>
      </span>
    </div>
  );
}
