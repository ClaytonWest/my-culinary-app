import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { User, Settings, HelpCircle, LogOut, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";

interface UserProfilePopupProps {
  isExpanded?: boolean;
}

export function UserProfilePopup({ isExpanded = false }: UserProfilePopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const profile = useQuery(api.users.getProfile);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const toggleTheme = () => {
    if (theme === "system") {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    } else {
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const menuItems = [
    {
      icon: resolvedTheme === "dark" ? Sun : Moon,
      label: resolvedTheme === "dark" ? "Light mode" : "Dark mode",
      onClick: toggleTheme,
    },
    {
      icon: Settings,
      label: "Personalization",
      onClick: () => {
        navigate("/settings");
        setIsOpen(false);
      },
    },
    {
      icon: Settings,
      label: "Settings",
      onClick: () => {
        navigate("/settings");
        setIsOpen(false);
      },
    },
    {
      icon: HelpCircle,
      label: "Help",
      onClick: () => {
        setIsOpen(false);
      },
    },
  ];

  return (
    <div ref={popupRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group relative flex items-center w-full py-2.5 rounded-lg transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          isExpanded ? "gap-3 px-3" : "justify-center px-2",
          isOpen && "bg-muted text-foreground"
        )}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>

        {isExpanded && (
          <span className="text-sm font-medium truncate">
            {profile?.name || "User"}
          </span>
        )}

        {!isExpanded && (
          <div
            role="tooltip"
            className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md
                       opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200
                       whitespace-nowrap z-50 pointer-events-none"
          >
            {profile?.name || "User"}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 min-w-[200px] bg-popover border border-border rounded-lg shadow-lg py-1",
            isExpanded
              ? "bottom-full left-0 mb-2"
              : "bottom-0 left-full ml-2"
          )}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium">{profile?.name || "User"}</p>
          </div>

          <div className="py-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                role="menuitem"
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="border-t border-border py-1">
            <button
              onClick={handleSignOut}
              role="menuitem"
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
