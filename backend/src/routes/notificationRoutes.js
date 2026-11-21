const express = require("express");

const notificationController =
    require("../controllers/notificationController");

const authMiddleware =
    require("../middleware/authMiddleware");
const notificationUserMiddleware =
    require("../middleware/roleMiddleware")("manager", "employee");

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    notificationUserMiddleware,
    notificationController.getNotifications
);

router.patch(
    "/read-all",
    authMiddleware,
    notificationUserMiddleware,
    notificationController.markAllAsRead
);

router.patch(
    "/:id/read",
    authMiddleware,
    notificationUserMiddleware,
    notificationController.markAsRead
);

module.exports = router;
