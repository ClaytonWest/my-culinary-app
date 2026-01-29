import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface MotionContextValue {
  prefersReducedMotion: boolean;
  enableAnimations: boolean;
  setEnableAnimations: (enabled: boolean) => void;
}

const MotionContext = createContext<MotionContextValue | undefined>(undefined);

const STORAGE_KEY = "culinary-animations";

export function MotionProvider({ children }: { children: ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const [enableAnimations, setEnableAnimationsState] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return stored === "true";
    }
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const setEnableAnimations = (enabled: boolean) => {
    setEnableAnimationsState(enabled);
    localStorage.setItem(STORAGE_KEY, String(enabled));
  };

  const shouldAnimate = enableAnimations && !prefersReducedMotion;

  return (
    <MotionContext.Provider
      value={{
        prefersReducedMotion,
        enableAnimations: shouldAnimate,
        setEnableAnimations,
      }}
    >
      {children}
    </MotionContext.Provider>
  );
}

export function useMotion() {
  const context = useContext(MotionContext);
  if (!context) {
    throw new Error("useMotion must be used within a MotionProvider");
  }
  return context;
}
