import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem("gca_theme") || "dark");
  const [colorTheme, setColorTheme] = useState(localStorage.getItem("gca_color_theme") || "green");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("gca_theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.colorTheme = colorTheme;
    localStorage.setItem("gca_color_theme", colorTheme);
  }, [colorTheme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
      colorTheme,
      setColorTheme
    }),
    [theme, colorTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
