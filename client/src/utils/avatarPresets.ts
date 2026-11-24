import face01 from "../assets/avatars/face-01.svg";
import face02 from "../assets/avatars/face-02.svg";
import face03 from "../assets/avatars/face-03.svg";
import face04 from "../assets/avatars/face-04.svg";
import face05 from "../assets/avatars/face-05.svg";
import face06 from "../assets/avatars/face-06.svg";
import face07 from "../assets/avatars/face-07.svg";
import face08 from "../assets/avatars/face-08.svg";
import face09 from "../assets/avatars/face-09.svg";
import face10 from "../assets/avatars/face-10.svg";
import face11 from "../assets/avatars/face-11.svg";
import face12 from "../assets/avatars/face-12.svg";

export const AVATAR_PRESETS = [
  { id: "face-01", label: "Curly crop", image: face01 },
  { id: "face-02", label: "High bun", image: face02 },
  { id: "face-03", label: "Soft bob with glasses", image: face03 },
  { id: "face-04", label: "Natural curls", image: face04 },
  { id: "face-05", label: "Short textured hair", image: face05 },
  { id: "face-06", label: "Blue headscarf", image: face06 },
  { id: "face-07", label: "Long side braid", image: face07 },
  { id: "face-08", label: "Short hair with glasses", image: face08 },
  { id: "face-09", label: "Copper curls", image: face09 },
  { id: "face-10", label: "Long low ponytail", image: face10 },
  { id: "face-11", label: "Wavy fringe", image: face11 },
  { id: "face-12", label: "Round glasses", image: face12 },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];

export function isAvatarPresetId(value: unknown): value is AvatarPresetId {
  return typeof value === "string" && AVATAR_PRESETS.some((preset) => preset.id === value);
}

export function getDefaultAvatarPresetId(userId: number): AvatarPresetId {
  const index = Math.abs(Math.trunc(userId)) % AVATAR_PRESETS.length;
  return AVATAR_PRESETS[index].id;
}

export function getAvatarPresetImage(presetId: string | null | undefined, userId: number): string {
  const selectedId = isAvatarPresetId(presetId) ? presetId : getDefaultAvatarPresetId(userId);
  return AVATAR_PRESETS.find((preset) => preset.id === selectedId)?.image || AVATAR_PRESETS[0].image;
}
