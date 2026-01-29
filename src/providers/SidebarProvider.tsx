import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface SidebarContextValue {
  isExpanded: boolean;
  isPinned: boolean;
  isMobileOpen: boolean;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  pin: () => void;
  unpin: () => void;
  togglePin: () => void;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "culinary-sidebar-pinned";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isExpanded = isPinned || isHovered;

  const expand = useCallback(() => setIsHovered(true), []);
  const collapse = useCallback(() => setIsHovered(false), []);
  const toggle = useCallback(() => setIsHovered((prev) => !prev), []);

  const pin = useCallback(() => {
    setIsPinned(true);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const unpin = useCallback(() => {
    setIsPinned(false);
    localStorage.setItem(STORAGE_KEY, "false");
  }, []);

  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  const toggleMobile = useCallback(() => setIsMobileOpen((prev) => !prev), []);

  // Close mobile drawer when switching to desktop
  if (!isMobile && isMobileOpen) {
    setIsMobileOpen(false);
  }

  return (
    <SidebarContext.Provider
      value={{
        isExpanded,
        isPinned,
        isMobileOpen,
        expand,
        collapse,
        toggle,
        pin,
        unpin,
        togglePin,
        openMobile,
        closeMobile,
        toggleMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
