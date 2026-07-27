import { useState } from "react";

export interface AvatarProps {
  /** Ordered candidate image URLs (see `computeAvatarUrls` on the API side) — tried in order, falling through to the next on a load error. Never pass an empty array; the last entry (Dicebear) always resolves. */
  urls: string[];
  alt: string;
  /** Pixel size, both width and height (it's always square). */
  size?: number;
  className?: string;
}

/**
 * Dumb component: the caller (API response via `computeAvatarUrls`) already
 * decided the fallback order — this only walks it on load failure. No
 * business logic (mode resolution, hashing, chain order) lives here.
 */
export function Avatar({ urls, alt, size = 40, className = "" }: AvatarProps) {
  const [index, setIndex] = useState(0);
  const src = urls[Math.min(index, urls.length - 1)];

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={["rounded-full object-cover", className].join(" ")}
      onError={() =>
        setIndex((current) => Math.min(current + 1, urls.length - 1))
      }
    />
  );
}
