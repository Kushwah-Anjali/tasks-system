const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const csrfOriginMiddleware = require("../middleware/csrfOriginMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/profileController");

const router = express.Router();
router.use(authMiddleware, roleMiddleware("admin", "manager", "employee"));
router.get("/", controller.getMyProfile);
router.patch("/avatar", csrfOriginMiddleware, controller.updateMyAvatar);

module.exports = router;
