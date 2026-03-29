import type { NavItem } from "./types";

/** Top navigation — paths must match React Router routes in `App.tsx`. */
export const navItems: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/experience", label: "Experience" },
  { to: "/projects", label: "Projects" },
  { to: "/writing", label: "Writing" },
  { to: "/resume", label: "Resume" },
  { to: "/contact", label: "Contact" },
];
