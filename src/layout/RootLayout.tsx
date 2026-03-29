import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="absolute left-[-9999px] top-4 z-[100] rounded-md bg-[var(--color-surface-elevated)] px-4 py-2 text-sm text-[var(--color-ink)] focus:left-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
