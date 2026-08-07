import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Nunito", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        hold: {
          pink: "hsl(var(--hold-pink))",
          blue: "hsl(var(--hold-blue))",
          green: "hsl(var(--hold-green))",
          yellow: "hsl(var(--hold-yellow))",
          orange: "hsl(var(--hold-orange))",
          purple: "hsl(var(--hold-purple))",
          coral: "hsl(var(--hold-coral))",
          mint: "hsl(var(--hold-mint))",
        },
        wall: {
          light: "hsl(var(--wall-light))",
          medium: "hsl(var(--wall-medium))",
          dark: "hsl(var(--wall-dark))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        hold: "var(--shadow-hold)",
        card: "var(--shadow-card)",
      },
      backgroundImage: {
        "wall-gradient": "var(--gradient-wall)",
        "card-gradient": "var(--gradient-card)",
        "hold-gradient-pink": "var(--gradient-hold-pink)",
        "hold-gradient-blue": "var(--gradient-hold-blue)",
        "hold-gradient-green": "var(--gradient-hold-green)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "hold-pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
        "route-trace": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.7)" },
          "50%": { boxShadow: "0 0 0 8px hsl(var(--primary) / 0)" },
        },
        "bounce-gentle": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "swipe-right": {
          "0%": { transform: "translateX(0) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translateX(300px) rotate(15deg)",
            opacity: "0",
          },
        },
        "swipe-left": {
          "0%": { transform: "translateX(0) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translateX(-300px) rotate(-15deg)",
            opacity: "0",
          },
        },
        "swipe-up": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": {
            transform: "translateY(-300px) scale(1.1)",
            opacity: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "hold-pop": "hold-pop 0.3s ease-out",
        "route-trace": "route-trace 2s ease-in-out infinite",
        "bounce-gentle": "bounce-gentle 2s ease-in-out infinite",
        "swipe-right": "swipe-right 0.3s ease-out forwards",
        "swipe-left": "swipe-left 0.3s ease-out forwards",
        "swipe-up": "swipe-up 0.3s ease-out forwards",
      },

      /* ✅ 新增：全局内容宽度限制 */
      maxWidth: {
        content: "960px",
      },
    },
  },
  plugins: [animatePlugin],
} satisfies Config;
