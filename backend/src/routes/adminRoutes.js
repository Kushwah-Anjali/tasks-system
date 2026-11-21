const express = require("express");
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const csrfOriginMiddleware = require("../middleware/csrfOriginMiddleware");
const passwordChangeRateLimiter = require("../middleware/passwordChangeRateLimiter");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);
router.get("/accounts", adminController.listAccounts);
router.post("/accounts", adminController.createAccount);
router.patch("/accounts/:userId/status", adminController.setAccountActive);
router.post(
  "/accounts/:userId/password",
  csrfOriginMiddleware,
  passwordChangeRateLimiter,
  adminController.resetAccountPassword
);

module.exports = router;
