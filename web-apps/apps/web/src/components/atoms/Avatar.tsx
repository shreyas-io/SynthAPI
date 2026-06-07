import { useState } from "react";

type AvatarProps = {
  src: string | null | undefined;
  label: string;
  className: string;
  fallbackClassName: string;
  alt?: string;
};

export function Avatar({
  src,
  label,
  className,
  fallbackClassName,
  alt = "",
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = label.charAt(0).toUpperCase() || "?";

  if (!src || failed) {
    return (
      <span className={`${className} ${fallbackClassName}`}>
        {initial}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
