"use client";

import { THEMES, type ThemeName } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const THEME_LABELS: Record<ThemeName, string> = {
  community: "Community (light)",
  "community-dark": "Community (dark)",
  light: "Simple light",
};

export function ThemeSelector() {
  const [theme, setTheme] = useState<ThemeName>("community");

  useEffect(() => {
    const saved = localStorage.getItem("ccdash-theme") as ThemeName | null;
    if (saved && THEMES.includes(saved)) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  async function handleChange(next: ThemeName) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ccdash-theme", next);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, theme_name: next });
    }
  }

  return (
    <label className="navbar-field navbar-field-inline">
      <span className="navbar-field-label sr-only">Theme</span>
      <select
        className="navbar-select navbar-select-compact"
        value={theme}
        onChange={(e) => handleChange(e.target.value as ThemeName)}
        aria-label="Theme"
      >
        {THEMES.map((t) => (
          <option key={t} value={t}>
            {THEME_LABELS[t]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ThemeInitializer({ theme }: { theme?: string }) {
  useEffect(() => {
    const initial =
      theme ??
      (localStorage.getItem("ccdash-theme") as ThemeName | null) ??
      "community";
    document.documentElement.setAttribute("data-theme", initial);
  }, [theme]);

  return null;
}
