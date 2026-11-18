const taskService = require("../services/taskService");
const aiService = require("../services/aiService");

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;
const requestsByUser = new Map();
const TRANSCRIPTION_RATE_LIMIT = 5;
const TRANSCRIPTION_RATE_WINDOW_MS = 60 * 1000;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const transcriptionRequestsByUser = new Map();

const takeRateLimitSlot = (userId, now = Date.now()) => {
    const recentRequests = (requestsByUser.get(userId) || []).filter((time) => now - time < RATE_WINDOW_MS);
    if (recentRequests.length >= RATE_LIMIT) {
        requestsByUser.set(userId, recentRequests);
        return false;
    }
    recentRequests.push(now);
    requestsByUser.set(userId, recentRequests);
    return true;
};

const createTaskDraft = async (req, res) => {
    const body = req.body;
    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).some((key) => key !== "description") ||
        typeof body.description !== "string"
    ) {
        return res.status(400).json({ message: "Provide a task description as text." });
    }

    const description = body.description.trim();
    if (description.length < 5 || description.length > 1000) {
        return res.status(400).json({ message: "Task descriptions must be between 5 and 1000 characters." });
    }

    if (!takeRateLimitSlot(req.user.id)) {
        return res.status(429).json({ message: "You have requested several drafts. Wait a minute and try again." });
    }

    const abortController = new AbortController();
    req.once("aborted", () => abortController.abort());

    try {
        const eligibleAssignees = await taskService.getTaskAssignees();
        const draft = await aiService.createTaskDraft({
            description,
            eligibleAssignees,
            signal: abortController.signal,
        });
        if (!res.destroyed) return res.status(200).json({ draft });
        return undefined;
    } catch (error) {
        const status = Number(error?.statusCode) || 502;
        const safeMessage = error?.statusCode
            ? error.message
            : "AI drafting failed. Please enter task details manually.";
        if (!res.destroyed) return res.status(status).json({ message: safeMessage });
        return undefined;
    }
};

const takeTranscriptionRateLimitSlot = (userId, now = Date.now()) => {
    const recentRequests = (transcriptionRequestsByUser.get(userId) || [])
        .filter((time) => now - time < TRANSCRIPTION_RATE_WINDOW_MS);
    if (recentRequests.length >= TRANSCRIPTION_RATE_LIMIT) {
        transcriptionRequestsByUser.set(userId, recentRequests);
        return false;
    }
    recentRequests.push(now);
    transcriptionRequestsByUser.set(userId, recentRequests);
    return true;
};

const rateLimitTranscription = (req, res, next) => {
    if (!takeTranscriptionRateLimitSlot(req.user.id)) {
        return res.status(429).json({ message: "You have requested several transcriptions. Wait a minute and try again." });
    }
    next();
};

const allowedAudioTypes = new Set([
    "audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/mp3",
    "audio/wav", "audio/x-wav", "audio/flac", "audio/x-flac", "audio/mpga",
]);

const hasAudioSignature = (buffer, mimeType) => {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
    if (mimeType === "audio/webm") return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    if (mimeType === "audio/mp4") return buffer.length >= 8 && buffer.toString("ascii", 4, 8) === "ftyp";
    if (mimeType === "audio/ogg") return buffer.toString("ascii", 0, 4) === "OggS";
    if (mimeType === "audio/wav" || mimeType === "audio/x-wav") {
        return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE";
    }
    if (mimeType === "audio/flac" || mimeType === "audio/x-flac") return buffer.toString("ascii", 0, 4) === "fLaC";
    if (mimeType === "audio/mpeg" || mimeType === "audio/mp3" || mimeType === "audio/mpga") {
        return buffer.toString("ascii", 0, 3) === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
    }
    return false;
};

const transcribeTaskAudio = async (req, res) => {
    const audioBuffer = req.body;
    const requestMimeType = String(req.get("content-type") || "")
        .trim()
        .toLowerCase();
    const mimeType = requestMimeType
        .split(";")[0]
        .trim();
    const language = String(req.query.language || "hi").toLowerCase();

    try {
        if (!allowedAudioTypes.has(mimeType)) {
            return res.status(415).json({ message: "This audio format is not supported. Try recording again." });
        }
        if (!["auto", "hi", "en"].includes(language)) {
            return res.status(400).json({ message: "Choose Auto, Hindi, or English for transcription." });
        }
        if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
            return res.status(400).json({ message: "No audio was received. Record a short instruction and try again." });
        }
        if (audioBuffer.length > MAX_AUDIO_BYTES) {
            return res.status(413).json({ message: "That recording is too large. Keep recordings under 60 seconds and try again." });
        }
        if (!hasAudioSignature(audioBuffer, mimeType)) {
            return res.status(415).json({ message: "The uploaded file does not appear to be supported audio." });
        }

        const abortController = new AbortController();
        req.once("aborted", () => abortController.abort());
        const eligibleAssignees = await taskService.getTaskAssignees();
        const result = await aiService.transcribeAudio({
            audioBuffer,
            mimeType: requestMimeType,
            language,
            eligibleAssigneeNames: eligibleAssignees.map((member) => member.full_name),
            signal: abortController.signal,
        });
        if (!res.destroyed) return res.status(200).json(result);
        return undefined;
    } catch (error) {
        const status = Number(error?.statusCode) || 502;
        const safeMessage = error?.statusCode
            ? error.message
            : "Transcription failed. Please try again or type the instruction.";
        if (!res.destroyed) return res.status(status).json({ message: safeMessage });
        return undefined;
    } finally {
        if (Buffer.isBuffer(audioBuffer)) audioBuffer.fill(0);
    }
};

module.exports = {
    createTaskDraft,
    rateLimitTranscription,
    transcribeTaskAudio,
    hasAudioSignature,
    MAX_AUDIO_BYTES,
};
