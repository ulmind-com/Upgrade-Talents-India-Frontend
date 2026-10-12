import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

function preferredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem("eventora_theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const current = preferredTheme();
    setTheme(current);
    document.documentElement.dataset.theme = current;
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("eventora_theme", next);
  }
  const label = theme === "dark" ? "Use light theme" : "Use dark theme";
  return (
    <Button type="button" variant="ghost" size={compact ? "icon" : "default"} onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? <Sun /> : <Moon />}{compact ? null : <span>{theme === "dark" ? "Light" : "Dark"}</span>}
    </Button>
  );
}