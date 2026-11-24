import { useCallback, useEffect, useState } from "react";
import { getDefaultAvatarPresetId } from "../utils/avatarPresets";
import { getMyProfile, profileUpdatedEventName, type UserAvatarProfile } from "../services/profileService";

const emptyProfile = (): UserAvatarProfile => ({ avatarPresetId: null, photoUrl: null, photoUploadsAvailable: false });

export function useUserAvatarProfile(userId: number) {
  const [profile, setProfile] = useState<UserAvatarProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setError("");
    try { setProfile(await getMyProfile()); }
    catch { setError("Unable to load your profile picture settings."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // The request is asynchronous; its state updates happen after the effect returns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    window.addEventListener(profileUpdatedEventName, reload);
    return () => window.removeEventListener(profileUpdatedEventName, reload);
  }, [reload]);
  return { profile, setProfile, loading, error, reload, defaultPresetId: getDefaultAvatarPresetId(userId) };
}
