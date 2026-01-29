import { Menu, ChefHat } from "lucide-react";
import { useSidebar } from "@/providers/SidebarProvider";

export function MobileHeader() {
  const { toggleMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border md:hidden">
      <button
        onClick={toggleMobile}
        className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <ChefHat className="h-6 w-6 text-primary" />
        <span className="font-semibold text-lg">Culinary AI</span>
      </div>

      <div className="w-9" />
    </header>
  );
}
