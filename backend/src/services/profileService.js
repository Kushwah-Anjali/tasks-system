const db = require("../config/db");

const AVATAR_PRESET_IDS = Object.freeze([
  "face-01", "face-02", "face-03", "face-04", "face-05", "face-06",
  "face-07", "face-08", "face-09", "face-10", "face-11", "face-12",
]);
const ALLOWED = new Set(AVATAR_PRESET_IDS);

const validateAvatarPreset = (value) => {
  if (typeof value !== "string" || !ALLOWED.has(value)) {
    const error = new Error("Choose one of the available profile avatars.");
    error.statusCode = 400;
    error.code = "INVALID_AVATAR_PRESET";
    throw error;
  }
  return value;
};

const validatePatch = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, "avatarPresetId")) {
    const error = new Error("Only your profile avatar preset can be changed.");
    error.statusCode = 400;
    error.code = "INVALID_PROFILE_UPDATE";
    throw error;
  }
  return validateAvatarPreset(body.avatarPresetId);
};

const getMyProfile = async (userId) => {
  const [rows] = await db.promise().query("SELECT avatar_preset_id FROM users WHERE id = ? LIMIT 1", [userId]);
  if (!rows.length) {
    const error = new Error("Account not found."); error.statusCode = 404; error.code = "ACCOUNT_NOT_FOUND"; throw error;
  }
  return { avatarPresetId: rows[0].avatar_preset_id || null, photoUrl: null, photoUploadsAvailable: false };
};

const updateMyAvatar = async (userId, body) => {
  const avatarPresetId = validatePatch(body);
  const [result] = await db.promise().query("UPDATE users SET avatar_preset_id = ? WHERE id = ?", [avatarPresetId, userId]);
  if (result.affectedRows === 0) {
    const profile = await getMyProfile(userId);
    if (profile.avatarPresetId !== avatarPresetId) {
      const error = new Error("Account not found."); error.statusCode = 404; error.code = "ACCOUNT_NOT_FOUND"; throw error;
    }
  }
  return getMyProfile(userId);
};

module.exports = { AVATAR_PRESET_IDS, getMyProfile, updateMyAvatar, validateAvatarPreset, validatePatch };
