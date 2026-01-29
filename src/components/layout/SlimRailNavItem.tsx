import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlimRailNavItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isExpanded?: boolean;
  onClick?: () => void;
  badge?: number;
}

export function SlimRailNavItem({
  icon: Icon,
  label,
  isActive = false,
  isExpanded = false,
  onClick,
  badge,
}: SlimRailNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center w-full py-2.5 rounded-lg transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isExpanded ? "gap-3 px-3" : "justify-center px-2",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />

      {isExpanded && (
        <span className="text-sm font-medium truncate">{label}</span>
      )}

      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "absolute flex items-center justify-center min-w-[18px] h-[18px] text-xs font-medium rounded-full px-1",
            isExpanded ? "right-2" : "top-0 right-0",
            isActive
              ? "bg-primary-foreground text-primary"
              : "bg-primary text-primary-foreground"
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      {!isExpanded && (
        <div
          role="tooltip"
          className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md
                     opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200
                     whitespace-nowrap z-50 pointer-events-none"
        >
          {label}
        </div>
      )}
    </button>
  );
}
