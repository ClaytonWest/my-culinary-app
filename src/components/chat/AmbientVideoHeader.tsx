import { useRef, useEffect } from "react";
import { useMotion } from "@/providers/MotionProvider";
import { cn } from "@/lib/utils";

interface AmbientVideoHeaderProps {
  isCollapsed?: boolean;
  className?: string;
}

export function AmbientVideoHeader({
  isCollapsed = false,
  className,
}: AmbientVideoHeaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { enableAnimations } = useMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (enableAnimations && !isCollapsed) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [enableAnimations, isCollapsed]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        enableAnimations ? "transition-all duration-500" : "",
        isCollapsed
          ? "h-header-collapsed"
          : "h-[120px] md:h-header",
        className
      )}
    >
      {enableAnimations ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src="/videos/ambient-kitchen.mp4"
          poster="/images/ambient-kitchen-poster.jpg"
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: "url('/images/ambient-kitchen-poster.jpg')" }}
          aria-hidden="true"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  );
}
