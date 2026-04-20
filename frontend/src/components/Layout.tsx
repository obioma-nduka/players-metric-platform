import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/context/AuthContext";
import { useThemeStore } from "@/context/ThemeContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout() {
  const token = useAuthStore((s) => s.token);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (token) void refreshMe();
  }, [token, refreshMe]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <div className="platform-layout">
      <Navbar />
      <main className="platform-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
