import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface StableAvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  fallbackClassName?: string;
}

export function StableAvatar({
  src,
  alt = "",
  size = 32,
  className,
  fallbackClassName,
}: StableAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const initials =
    alt
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full bg-gray-200", className)}
      style={{ width: size, height: size }}
    >
      {src && !imageError ? (
        <>
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
          <Image
            src={src}
            alt={alt}
            fill
            sizes={`${size}px`}
            className="object-cover"
            onLoad={(e) => {
              const placeholder = e.currentTarget.previousElementSibling;
              if (placeholder) {
                placeholder.remove();
              }
            }}
            onError={() => setImageError(true)}
          />
        </>
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-gray-400 text-xs font-medium text-white",
            fallbackClassName
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
