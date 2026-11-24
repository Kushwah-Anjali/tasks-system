const profileService = require("../services/profileService");

const getMyProfile = async (req, res) => {
  try { return res.status(200).json({ profile: await profileService.getMyProfile(req.user.id) }); }
  catch (error) { return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Unable to load your profile.", code: error.code }); }
};

const updateMyAvatar = async (req, res) => {
  try { return res.status(200).json({ profile: await profileService.updateMyAvatar(req.user.id, req.body) }); }
  catch (error) { return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Unable to update your profile avatar.", code: error.code }); }
};

module.exports = { getMyProfile, updateMyAvatar };
