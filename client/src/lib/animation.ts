import { type VariantProps, cva } from "class-variance-authority";

type DelayValue = 0 | 100 | 200 | 300 | 400 | 500;

export const fadeInVariants = cva("animate-in fade-in duration-300", {
  variants: {
    direction: {
      up: "slide-in-from-bottom-2",
      down: "slide-in-from-top-2",
      left: "slide-in-from-right-2",
      right: "slide-in-from-left-2",
    },
    delay: {
      0: "",
      100: "delay-100",
      200: "delay-200",
      300: "delay-300",
      400: "delay-400",
      500: "delay-500",
    } as Record<DelayValue, string>,
  },
  defaultVariants: {
    direction: "up",
    delay: 0,
  },
});

export type FadeInVariants = VariantProps<typeof fadeInVariants>;

export const scaleVariants = cva("transition-all duration-300 ease-out", {
  variants: {
    hover: {
      subtle: "hover:scale-[1.02] hover:-translate-y-0.5",
      medium: "hover:scale-105 hover:-translate-y-1",
      large: "hover:scale-110 hover:-translate-y-1.5",
    },
    active: {
      shrink: "active:scale-95",
      grow: "active:scale-105",
    },
    hover_opacity: {
      true: "hover:opacity-90",
      false: "",
    }
  },
  defaultVariants: {
    hover: "subtle",
    active: "shrink",
    hover_opacity: false,
  },
});

export type ScaleVariants = VariantProps<typeof scaleVariants>;

export const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow transition-all duration-300 ease-out", 
  {
    variants: {
      hover: {
        lift: "hover:-translate-y-1 hover:shadow-lg",
        glow: "hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)]",
        none: "",
      },
      animation: {
        fadeIn: "animate-in fade-in duration-500",
        slideIn: "animate-in slide-in-from-bottom-4 duration-500",
        none: "",
      }
    },
    defaultVariants: {
      hover: "lift",
      animation: "fadeIn",
    },
  }
);

export type CardVariants = VariantProps<typeof cardVariants>;