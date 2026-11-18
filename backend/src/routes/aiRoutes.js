const express = require("express");

const aiController = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const managerMiddleware = require("../middleware/managerMiddleware");

const router = express.Router();
const audioBodyParser = express.raw({
    type: () => true,
    limit: aiController.MAX_AUDIO_BYTES,
});

const parseAudioUpload = (req, res, next) => {
    audioBodyParser(req, res, (error) => {
        if (!error) return next();
        if (error.status === 413 || error.type === "entity.too.large") {
            return res.status(413).json({ message: "That recording is too large. Keep recordings under 60 seconds and try again." });
        }
        return res.status(400).json({ message: "The audio upload could not be read. Please record again." });
    });
};

router.post(
    "/task-draft",
    authMiddleware,
    managerMiddleware,
    aiController.createTaskDraft
);

router.post(
    "/transcribe",
    authMiddleware,
    managerMiddleware,
    aiController.rateLimitTranscription,
    parseAudioUpload,
    aiController.transcribeTaskAudio
);

module.exports = router;
