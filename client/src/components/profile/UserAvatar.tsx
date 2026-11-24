import { useState } from "react";
import { getAvatarPresetImage } from "../../utils/avatarPresets";

interface UserAvatarProps {
  userId: number;
  name: string;
  presetId?: string | null;
  photoUrl?: string | null;
  size?: number;
  className?: string;
  decorative?: boolean;
}

const initials = (name: string) => name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";

export default function UserAvatar({ userId, name, presetId, photoUrl, size = 40, className = "", decorative = true }: UserAvatarProps) {
  const presetImage = getAvatarPresetImage(presetId, userId);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const image = photoUrl && failedImage !== photoUrl ? photoUrl : failedImage !== presetImage ? presetImage : null;
  return <span
    aria-hidden={decorative ? true : undefined}
    aria-label={decorative ? undefined : `${name || "User"} avatar`}
    role={decorative ? undefined : "img"}
    className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 font-semibold text-slate-600 ${className}`}
    style={{ width: size, height: size, minWidth: size, minHeight: size }}
  >{image ? <img src={image} alt="" className="h-full w-full rounded-full object-cover" onError={() => setFailedImage(image)} /> : <span className="text-xs" aria-hidden="true">{initials(name)}</span>}</span>;
}
