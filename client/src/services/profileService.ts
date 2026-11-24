import api from "./api";
import type { AvatarPresetId } from "../utils/avatarPresets";

export interface UserAvatarProfile {
  avatarPresetId: AvatarPresetId | null;
  photoUrl: string | null;
  photoUploadsAvailable: boolean;
}

export const getMyProfile = async (): Promise<UserAvatarProfile> =>
  (await api.get<{ profile: UserAvatarProfile }>("/profile")).data.profile;

export const saveMyAvatarPreset = async (avatarPresetId: AvatarPresetId): Promise<UserAvatarProfile> =>
  (await api.patch<{ profile: UserAvatarProfile }>("/profile/avatar", { avatarPresetId })).data.profile;

export const profileUpdatedEventName = "task-system:profile-avatar-updated";

export function notifyProfileAvatarUpdated() {
  window.dispatchEvent(new Event(profileUpdatedEventName));
}
