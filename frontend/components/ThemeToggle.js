"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      setDark(false);
      document.documentElement.dataset.theme = "light";
    }
  }, []);

  const toggle = () => {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    localStorage.setItem("theme", nextDark ? "dark" : "light");
  };

  return (
    <button type="button" className="theme-toggle-btn" onClick={toggle} aria-label="Cambiar tema">
      <span aria-hidden>{dark ? "☀️" : "🌙"}</span>
      {dark ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
