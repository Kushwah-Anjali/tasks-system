const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const csrfOriginMiddleware = require("../middleware/csrfOriginMiddleware");
const passwordChangeRateLimiter = require("../middleware/passwordChangeRateLimiter");
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post(
  "/change-password",
  authMiddleware,
  csrfOriginMiddleware,
  passwordChangeRateLimiter,
  authController.changePassword
);


module.exports = router;
