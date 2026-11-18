import {
    useEffect,
    useRef,
    useState,
} from "react";
import { isAxiosError } from "axios";
import { Mic, Square } from "lucide-react";
import Swal from "sweetalert2";

import type {
    FormEvent,
} from "react";

import { createTask, generateTaskDraft, getTaskAssignees, transcribeTaskInstruction, updateTask } from "../../services/taskService";
import type { TaskDraft } from "../../services/taskService";

import type { Task, TaskAssignee, TaskPriority } from "../../types/task";
import { normalizeTaskPriority } from "../../utils/taskPriority";

import Modal from "./Modal";

interface CreateTaskModalProps {
    open: boolean;
    onClose: () => void;
    accountUserId: number;
    task?: Task | null;

    onCreated:
        | (() => void)
        | (() => Promise<void>);
}

interface FormErrors {
    title?: string;
    assignedTo?: string;
    dueDate?: string;
}

const inputClassName =
    "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:opacity-70";

const getTodayDate = (): string => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
};

const MAX_RECORDING_SECONDS = 60;
const MAX_RECORDING_BYTES = 5 * 1024 * 1024;
type VoiceState = "idle" | "requesting" | "recording" | "finalizing" | "transcribing" | "drafting";
type TranscriptionLanguage = "auto" | "hi" | "en";
type VoiceProgress = "idle" | "listening" | "understanding" | "ready";
type VoiceFailureStage = "transcription" | "draft" | null;
interface RecordedAudio {
    blob: Blob;
    objectUrl: string;
    mimeType: string;
    extension: string;
    lowAudioLevel: boolean;
    tooLarge: boolean;
}
interface PendingVoiceDraft {
    draft: TaskDraft;
    startingVersions: { title: number; assignedTo: number; dueDate: number; priority: number };
    hadExistingFields: boolean;
}
const getMonotonicNow = () => performance.now();
const VOICE_DIAGNOSTICS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_TASK_VOICE_DIAGNOSTICS === "true";

const getSavedTranscriptionLanguage = (userId: number): TranscriptionLanguage => {
    if (typeof window === "undefined") return "hi";
    try {
        const saved = window.localStorage.getItem(`task-voice-language:${userId}`);
        return saved === "auto" || saved === "en" || saved === "hi" ? saved : "hi";
    } catch {
        return "hi";
    }
};

const getAudioExtension = (mimeType: string): string | null => {
    const baseMimeType = mimeType.split(";")[0].trim().toLowerCase();
    const extensions: Record<string, string> = {
        "audio/webm": "webm",
        "audio/mp4": "mp4",
        "audio/ogg": "ogg",
    };
    return extensions[baseMimeType] || null;
};

export default function CreateTaskModal({
    open,
    onClose,
    accountUserId,
    onCreated,
    task = null,
}: CreateTaskModalProps) {
    const [employees, setEmployees] =
        useState<TaskAssignee[]>([]);

    const [
        isLoadingEmployees,
        setIsLoadingEmployees,
    ] = useState(true);

    const [title, setTitle] = useState(task?.title || "");

    const [assignedTo, setAssignedTo] =
        useState<number | null>(task?.assigned_to || null);

    const [dueDate, setDueDate] = useState(task?.due_date || "");

    const [priority, setPriority] = useState<TaskPriority>(normalizeTaskPriority(task?.priority));

    const [errors, setErrors] =
        useState<FormErrors>({});

    const [submitError, setSubmitError] =
        useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [draftDescription, setDraftDescription] = useState("");
    const draftDescriptionRef = useRef("");
    const instructionEditVersionRef = useRef(0);
    const [draftClarifications, setDraftClarifications] = useState<string[]>([]);
    const [draftError, setDraftError] = useState("");
    const [isDrafting, setIsDrafting] = useState(false);
    const draftGenerationRef = useRef(0);
    const draftInFlightRef = useRef(false);
    const fieldEditVersionsRef = useRef({ title: 0, assignedTo: 0, dueDate: 0, priority: 0 });
    const [voiceState, setVoiceState] = useState<VoiceState>("idle");
    const [voiceError, setVoiceError] = useState("");
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [pendingTranscript, setPendingTranscript] = useState("");
    const [transcriptionLanguage, setTranscriptionLanguage] = useState<TranscriptionLanguage>(() => getSavedTranscriptionLanguage(accountUserId));
    const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
    const recordedAudioRef = useRef<RecordedAudio | null>(null);
    const [hasVoiceTranscript, setHasVoiceTranscript] = useState(false);
    const [voiceProgress, setVoiceProgress] = useState<VoiceProgress>("idle");
    const [voiceFlowStarted, setVoiceFlowStarted] = useState(false);
    const [voiceFailureStage, setVoiceFailureStage] = useState<VoiceFailureStage>(null);
    const [pendingVoiceDraft, setPendingVoiceDraft] = useState<PendingVoiceDraft | null>(null);
    const voiceGenerationRef = useRef(0);
    const accountUserIdRef = useRef(accountUserId);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const stopDispositionRef = useRef<"transcribe" | "cancel">("cancel");
    const recordingStartedAtRef = useRef(0);
    const recordingTimerRef = useRef<number | null>(null);
    const transcriptionAbortRef = useRef<AbortController | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioLevelTimerRef = useRef<number | null>(null);
    const audioLevelStatsRef = useRef({ samples: 0, activeSamples: 0, maxRms: 0, totalRms: 0 });
    const recordingFinalizationRef = useRef<{ requestId: number; stopRequested: boolean; finalDataReceived: boolean } | null>(null);
    const voiceInstructionSnapshotRef = useRef({ text: "", editVersion: 0 });
    const voiceFieldsSnapshotRef = useRef<PendingVoiceDraft["startingVersions"]>({ title: 0, assignedTo: 0, dueDate: 0, priority: 0 });
    const voiceHadExistingFieldsRef = useRef(false);
    const voiceTranscriptRef = useRef("");
    const voiceAutoDraftAfterChoiceRef = useRef(false);

    const updateInstructionText = (text: string) => {
        instructionEditVersionRef.current += 1;
        draftDescriptionRef.current = text;
        setDraftDescription(text);
    };

    const updateTranscriptionLanguage = (language: TranscriptionLanguage) => {
        setTranscriptionLanguage(language);
        try {
            window.localStorage.setItem(`task-voice-language:${accountUserId}`, language);
        } catch {
            // The default remains usable when browser storage is unavailable.
        }
    };

    const clearRecordingTimer = () => {
        if (recordingTimerRef.current !== null) {
            window.clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    const clearAudioLevelMonitor = (resetStats = false) => {
        if (audioLevelTimerRef.current !== null) {
            window.clearInterval(audioLevelTimerRef.current);
            audioLevelTimerRef.current = null;
        }
        audioContextRef.current?.close().catch(() => undefined);
        audioContextRef.current = null;
        if (resetStats) audioLevelStatsRef.current = { samples: 0, activeSamples: 0, maxRms: 0, totalRms: 0 };
    };

    const startAudioLevelMonitor = (stream: MediaStream) => {
        try {
            if (!window.AudioContext) return;
            const context = new AudioContext();
            const source = context.createMediaStreamSource(stream);
            const analyser = context.createAnalyser();
            const silentOutput = context.createGain();
            const samples = new Float32Array(analyser.fftSize);
            silentOutput.gain.value = 0;
            source.connect(analyser);
            analyser.connect(silentOutput);
            silentOutput.connect(context.destination);
            audioContextRef.current = context;
            if (context.state === "suspended") void context.resume().catch(() => undefined);
            audioLevelTimerRef.current = window.setInterval(() => {
                analyser.getFloatTimeDomainData(samples);
                let squares = 0;
                for (const sample of samples) squares += sample * sample;
                const rms = Math.sqrt(squares / samples.length);
                const stats = audioLevelStatsRef.current;
                stats.samples += 1;
                stats.totalRms += rms;
                stats.maxRms = Math.max(stats.maxRms, rms);
                if (rms >= 0.008) stats.activeSamples += 1;
            }, 100);
        } catch {
            clearAudioLevelMonitor(true);
        }
    };

    const clearRecordedAudio = () => {
        if (recordedAudioRef.current) URL.revokeObjectURL(recordedAudioRef.current.objectUrl);
        recordedAudioRef.current = null;
        setRecordedAudio(null);
    };

    const clearRecordedAudioIfNormal = () => {
        if (!VOICE_DIAGNOSTICS_ENABLED) clearRecordedAudio();
    };

    const storeRecordedAudio = (audio: RecordedAudio) => {
        if (recordedAudioRef.current) URL.revokeObjectURL(recordedAudioRef.current.objectUrl);
        recordedAudioRef.current = audio;
        setRecordedAudio(audio);
    };

    const stopMicrophoneTracks = () => {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
    };

    const cancelVoiceInput = (clearMessage = true) => {
        voiceGenerationRef.current += 1;
        stopDispositionRef.current = "cancel";
        transcriptionAbortRef.current?.abort();
        transcriptionAbortRef.current = null;
        const recorder = mediaRecorderRef.current;
        mediaRecorderRef.current = null;
        if (recorder && recorder.state !== "inactive") {
            try { recorder.stop(); } catch { /* recorder may already be stopping */ }
        }
        stopMicrophoneTracks();
        clearRecordingTimer();
        clearAudioLevelMonitor(true);
        recordingFinalizationRef.current = null;
        audioChunksRef.current = [];
        clearRecordedAudio();
        setVoiceState("idle");
        setRecordingSeconds(0);
        setPendingTranscript("");
        setPendingVoiceDraft(null);
        setVoiceProgress("idle");
        setVoiceFlowStarted(false);
        setVoiceFailureStage(null);
        voiceAutoDraftAfterChoiceRef.current = false;
        if (clearMessage) setVoiceError("");
    };

    useEffect(() => () => {
        draftGenerationRef.current += 1;
        draftInFlightRef.current = false;
        voiceGenerationRef.current += 1;
        transcriptionAbortRef.current?.abort();
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            try { recorder.stop(); } catch { /* recorder may already be stopping */ }
        }
        stopMicrophoneTracks();
        clearRecordingTimer();
        clearAudioLevelMonitor(true);
        if (recordedAudioRef.current) URL.revokeObjectURL(recordedAudioRef.current.objectUrl);
    }, []);

    useEffect(() => {
        if (!open) return;

        let isActive = true;

        getTaskAssignees()
            .then((teamMemberList) => {
                if (isActive) {
                    setEmployees(teamMemberList);
                }
            })
            .catch(() => {
                if (isActive) {
                    setSubmitError(
                        "Unable to load employees. Please try again."
                    );
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsLoadingEmployees(
                        false
                    );
                }
            });

        return () => {
            isActive = false;
        };
    }, [open, task]);

    const validate = (): FormErrors => {
        const nextErrors: FormErrors = {};

        if (!title.trim()) {
            nextErrors.title =
                "Task title is required.";
        }

        if (!assignedTo) {
            nextErrors.assignedTo =
                "Please select an employee.";
        }

        if (dueDate && dueDate < getTodayDate()) {
            nextErrors.dueDate =
                "Due date cannot be in the past.";
        }

        return nextErrors;
    };

    const [transcriptionQualityWarning, setTranscriptionQualityWarning] = useState(false);

    const applyDraftFields = (
        draft: TaskDraft,
        startingVersions: PendingVoiceDraft["startingVersions"],
        force = false
    ) => {
        const preservedFields: string[] = [];
        if (force || fieldEditVersionsRef.current.title === startingVersions.title) {
            setTitle(draft.title ?? "");
        } else if (draft.title !== null) preservedFields.push("title");

        if (force || fieldEditVersionsRef.current.assignedTo === startingVersions.assignedTo) {
            setAssignedTo(draft.assigned_to);
        } else if (draft.assigned_to !== null) preservedFields.push("assignee");

        if (force || fieldEditVersionsRef.current.dueDate === startingVersions.dueDate) {
            setDueDate(draft.due_date ?? "");
        } else if (draft.due_date !== null) preservedFields.push("due date");

        if (force || fieldEditVersionsRef.current.priority === startingVersions.priority) {
            setPriority(draft.priority);
        } else preservedFields.push("priority");

        const clarifications = [...draft.clarifications];
        if (preservedFields.length > 0) {
            clarifications.push(`Kept your edits to ${preservedFields.join(", ")}.`);
        }
        setDraftClarifications(clarifications);
        setErrors({});
        return preservedFields;
    };

    const runVoiceDraft = async (
        instruction: string,
        requestId: number,
        requestUserId: number,
        startingVersions = voiceFieldsSnapshotRef.current,
        hadExistingFields = voiceHadExistingFieldsRef.current
    ) => {
        if (instruction.trim().length < 5 || instruction.trim().length > 1000) {
            setVoiceFailureStage("draft");
            setVoiceError("Edit the spoken instruction to 5–1,000 characters, then retry filling details.");
            setVoiceProgress("understanding");
            return;
        }

        const abortController = new AbortController();
        transcriptionAbortRef.current = abortController;
        const instructionVersionAtStart = instructionEditVersionRef.current;
        setVoiceState("drafting");
        setVoiceProgress("understanding");
        setVoiceFailureStage(null);
        setVoiceError("");
        try {
            const draft = await generateTaskDraft(instruction.trim(), abortController.signal);
            if (requestId !== voiceGenerationRef.current || requestUserId !== accountUserIdRef.current) return;
            if (instructionEditVersionRef.current !== instructionVersionAtStart) {
                setVoiceFailureStage("draft");
                setVoiceError("The spoken instruction changed while filling details. Retry filling details to use the edited instruction.");
                setVoiceProgress("understanding");
                return;
            }
            setDraftClarifications(draft.clarifications);
            const changedWhileRunning = Object.keys(startingVersions).some((key) =>
                fieldEditVersionsRef.current[key as keyof typeof startingVersions] !== startingVersions[key as keyof typeof startingVersions]
            );
            if (hadExistingFields || changedWhileRunning) {
                setPendingVoiceDraft({ draft, startingVersions, hadExistingFields });
            } else {
                applyDraftFields(draft, startingVersions);
                setPendingVoiceDraft(null);
            }
            setVoiceProgress("ready");
            setVoiceFailureStage(null);
        } catch {
            if (requestId !== voiceGenerationRef.current || requestUserId !== accountUserIdRef.current) return;
            setVoiceFailureStage("draft");
            setVoiceError("Transcript saved, but task details could not be filled. Retry filling details or edit the spoken instruction.");
            setVoiceProgress("understanding");
        } finally {
            if (requestId === voiceGenerationRef.current && requestUserId === accountUserIdRef.current) {
                if (transcriptionAbortRef.current === abortController) transcriptionAbortRef.current = null;
                setVoiceState("idle");
            }
        }
    };

    const transcribeRecording = async (
        blob: Blob,
        language: TranscriptionLanguage,
        requestId: number,
        requestUserId: number
    ) => {
        if (blob.size === 0) {
            if (requestId === voiceGenerationRef.current) {
                setVoiceState("idle");
                setVoiceError("No audio was recorded. Try again or type the instruction.");
                setVoiceFailureStage("transcription");
            }
            return;
        }
        if (blob.size > MAX_RECORDING_BYTES) {
            if (requestId === voiceGenerationRef.current) {
                setVoiceState("idle");
                setVoiceError("That recording is too large. Keep it under 60 seconds and try again.");
                setVoiceFailureStage("transcription");
            }
            return;
        }

        const abortController = new AbortController();
        transcriptionAbortRef.current = abortController;
        setVoiceState("transcribing");
        setVoiceProgress("understanding");
        setVoiceFailureStage(null);
        try {
            const result = await transcribeTaskInstruction(blob, language, abortController.signal);
            if (requestId !== voiceGenerationRef.current || requestUserId !== accountUserIdRef.current) return;
            const transcript = result.transcript;
            if (!transcript.trim()) {
                setVoiceError("We couldn't hear you clearly. Please try again.");
                setVoiceFailureStage("transcription");
                setVoiceProgress("listening");
                setVoiceState("idle");
                return;
            }
            voiceTranscriptRef.current = transcript.trim();
            setHasVoiceTranscript(true);
            setTranscriptionQualityWarning(result.qualityWarning);
            const instructionWasEdited =
                instructionEditVersionRef.current !== voiceInstructionSnapshotRef.current.editVersion ||
                Boolean(voiceInstructionSnapshotRef.current.text.trim());
            if (!instructionWasEdited) {
                updateInstructionText(transcript.trim());
                setPendingTranscript("");
                clearRecordedAudioIfNormal();
                if (transcriptionAbortRef.current === abortController) transcriptionAbortRef.current = null;
                await runVoiceDraft(transcript.trim(), requestId, requestUserId);
            } else {
                setPendingTranscript(transcript.trim());
                voiceAutoDraftAfterChoiceRef.current = true;
                setVoiceError("Choose Replace or Append to keep your existing instruction.");
                setVoiceState("idle");
            }
            if (requestId === voiceGenerationRef.current && requestUserId === accountUserIdRef.current && transcriptionAbortRef.current === abortController) {
                transcriptionAbortRef.current = null;
            }
        } catch (error: unknown) {
            if (requestId !== voiceGenerationRef.current || requestUserId !== accountUserIdRef.current) return;
            const status = isAxiosError(error) ? error.response?.status : undefined;
            const message = status === 422
                ? "We couldn't hear you clearly. Please try again."
                : isAxiosError<{ message?: string }>(error)
                    ? error.response?.data?.message || "Transcription failed. Please try again or type the instruction."
                    : "Transcription failed. Please try again or type the instruction.";
            setVoiceError(message);
            setVoiceFailureStage("transcription");
            setVoiceProgress("listening");
        } finally {
            if (requestId === voiceGenerationRef.current && requestUserId === accountUserIdRef.current) {
                if (transcriptionAbortRef.current === abortController) transcriptionAbortRef.current = null;
                if (voiceState !== "drafting") setVoiceState("idle");
            }
        }
    };

    const applyPendingVoiceDraft = () => {
        if (!pendingVoiceDraft) return;
        applyDraftFields(pendingVoiceDraft.draft, pendingVoiceDraft.startingVersions, true);
        setPendingVoiceDraft(null);
        setVoiceError("");
        setVoiceProgress("ready");
    };

    const retryVoiceDraft = () => {
        const instruction = draftDescriptionRef.current.trim();
        const requestId = ++voiceGenerationRef.current;
        void runVoiceDraft(instruction, requestId, accountUserId);
    };

    const startRecording = async () => {
        if (voiceState !== "idle" || !open || pendingVoiceDraft || pendingTranscript) return;
        clearRecordedAudio();
        clearAudioLevelMonitor(true);
        recordingFinalizationRef.current = null;
        const hostname = window.location.hostname;
        if (!window.isSecureContext && !["localhost", "127.0.0.1", "::1"].includes(hostname)) {
            setVoiceError("Microphone access requires HTTPS. Use a secure connection or localhost.");
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            setVoiceError("This browser cannot access a microphone. Try a supported browser or type the instruction.");
            return;
        }
        if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
            setVoiceError("This browser does not support audio recording. Type the instruction instead.");
            return;
        }

        const formats = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];
        const mimeType = formats.find((format) => MediaRecorder.isTypeSupported(format));
        if (!mimeType) {
            setVoiceError("This browser cannot record a supported audio format. Try a current browser or type the instruction.");
            return;
        }

        const requestId = ++voiceGenerationRef.current;
        const languageAtStart = transcriptionLanguage;
        voiceInstructionSnapshotRef.current = {
            text: draftDescriptionRef.current,
            editVersion: instructionEditVersionRef.current,
        };
        voiceFieldsSnapshotRef.current = { ...fieldEditVersionsRef.current };
        voiceHadExistingFieldsRef.current = Boolean(title.trim() || assignedTo !== null || dueDate);
        setVoiceFlowStarted(true);
        setVoiceProgress("listening");
        setPendingVoiceDraft(null);
        setVoiceFailureStage(null);
        setTranscriptionQualityWarning(false);
        setVoiceError("");
        setPendingTranscript("");
        setRecordingSeconds(0);
        setVoiceState("requesting");

        let stream: MediaStream | null = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (requestId !== voiceGenerationRef.current || accountUserId !== accountUserIdRef.current || !open) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            mediaStreamRef.current = stream;
            startAudioLevelMonitor(stream);
            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            const recordingChunks: Blob[] = [];
            audioChunksRef.current = recordingChunks;
            const finalization = { requestId, stopRequested: false, finalDataReceived: false };
            recordingFinalizationRef.current = finalization;
            stopDispositionRef.current = "cancel";
            recorder.ondataavailable = (event) => {
                if (finalization.stopRequested) finalization.finalDataReceived = true;
                if (event.data.size > 0 && requestId === voiceGenerationRef.current) {
                    recordingChunks.push(event.data);
                }
            };
            recorder.onerror = () => {
                if (requestId !== voiceGenerationRef.current) return;
                cancelVoiceInput(false);
                setVoiceError("Recording stopped unexpectedly. Please try again or type the instruction.");
            };
            recorder.onstop = () => {
                const chunks = recordingChunks;
                if (audioChunksRef.current === recordingChunks) audioChunksRef.current = [];
                if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null;
                stream?.getTracks().forEach((track) => track.stop());
                if (mediaStreamRef.current === stream) mediaStreamRef.current = null;
                if (requestId === voiceGenerationRef.current) {
                    clearRecordingTimer();
                    clearAudioLevelMonitor(false);
                }
                if (requestId !== voiceGenerationRef.current || stopDispositionRef.current !== "transcribe") return;
                if (!finalization.finalDataReceived) {
                    setVoiceState("idle");
                    setVoiceError("The final audio data was not received. Please record again.");
                    return;
                }
                const recorderMimeType = recorder.mimeType.trim();
                const chunkMimeTypes = new Set(chunks.map((chunk) => chunk.type.split(";")[0].trim().toLowerCase()).filter(Boolean));
                const recorderBaseMimeType = recorderMimeType.split(";")[0].trim().toLowerCase();
                if (chunkMimeTypes.size > 1 || (recorderBaseMimeType && [...chunkMimeTypes].some((type) => type !== recorderBaseMimeType))) {
                    setVoiceState("idle");
                    setVoiceError("The recording format changed while recording. Please try again.");
                    return;
                }
                const actualMimeType = recorderMimeType || chunks.find((chunk) => chunk.type)?.type || "";
                const extension = getAudioExtension(actualMimeType);
                if (!extension) {
                    setVoiceState("idle");
                    setVoiceError("The recorded audio format could not be verified. Please try again.");
                    return;
                }
                const blob = new Blob(chunks, { type: actualMimeType });
                if (blob.size === 0) {
                    setVoiceState("idle");
                    setVoiceError("No audio was recorded. Try again or type the instruction.");
                    return;
                }
                const stats = audioLevelStatsRef.current;
                const averageRms = stats.samples > 0 ? stats.totalRms / stats.samples : null;
                const activeRatio = stats.samples > 0 ? stats.activeSamples / stats.samples : null;
                const lowAudioLevel = stats.samples > 0 && (
                    stats.maxRms < 0.008 ||
                    (averageRms !== null && activeRatio !== null && averageRms < 0.004 && activeRatio < 0.04)
                );
                if (VOICE_DIAGNOSTICS_ENABLED) {
                    const objectUrl = URL.createObjectURL(blob);
                    storeRecordedAudio({
                        blob,
                        objectUrl,
                        mimeType: actualMimeType,
                        extension,
                        lowAudioLevel,
                        tooLarge: blob.size > MAX_RECORDING_BYTES,
                    });
                }
                if (blob.size > MAX_RECORDING_BYTES) {
                    setVoiceState("idle");
                    setVoiceFailureStage("transcription");
                    setVoiceProgress("listening");
                    setVoiceError("That recording is too large. Keep it under 60 seconds and try again.");
                    return;
                }
                if (lowAudioLevel) {
                    setVoiceState("idle");
                    setVoiceFailureStage("transcription");
                    setVoiceProgress("listening");
                    setVoiceError("We couldn't hear you clearly. Please try again.");
                    return;
                }
                setVoiceState("transcribing");
                setVoiceProgress("understanding");
                void transcribeRecording(blob, languageAtStart, requestId, accountUserId);
            };
            recordingStartedAtRef.current = getMonotonicNow();
            recorder.start(1000);
            setVoiceState("recording");
            setRecordingSeconds(0);
            recordingTimerRef.current = window.setInterval(() => {
                const elapsed = Math.floor((getMonotonicNow() - recordingStartedAtRef.current) / 1000);
                setRecordingSeconds(Math.min(elapsed, MAX_RECORDING_SECONDS));
                if (elapsed >= MAX_RECORDING_SECONDS) stopRecording();
            }, 250);
        } catch (error: unknown) {
            stream?.getTracks().forEach((track) => track.stop());
            if (mediaStreamRef.current === stream) mediaStreamRef.current = null;
            mediaRecorderRef.current = null;
            clearRecordingTimer();
            clearAudioLevelMonitor(true);
            if (requestId !== voiceGenerationRef.current) return;
            setVoiceState("idle");
            const errorName = error instanceof DOMException ? error.name : "";
            if (errorName === "NotAllowedError" || errorName === "SecurityError") {
                setVoiceError("Microphone permission was denied. Allow microphone access in your browser, or type the instruction.");
            } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
                setVoiceError("No microphone was found. Connect a microphone or type the instruction.");
            } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
                setVoiceError("The microphone is unavailable. Close other apps using it and try again.");
            } else {
                setVoiceError("Could not start recording. Check microphone access or type the instruction.");
            }
        }
    };

    const stopRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === "inactive") return;
        stopDispositionRef.current = "transcribe";
        const finalization = recordingFinalizationRef.current;
        if (finalization) finalization.stopRequested = true;
        setVoiceState("finalizing");
        clearRecordingTimer();
        clearAudioLevelMonitor(false);
        try {
            recorder.stop();
            stopMicrophoneTracks();
        } catch {
            cancelVoiceInput(false);
            setVoiceError("Recording could not be stopped. Please try again or type the instruction.");
        }
    };

    const applyPendingTranscript = (mode: "replace" | "append") => {
        if (!pendingTranscript) return;
        const currentText = draftDescriptionRef.current;
        const nextText = mode === "replace"
            ? pendingTranscript
            : `${currentText}${currentText && !/\s$/.test(currentText) ? "\n" : ""}${pendingTranscript}`;
        updateInstructionText(nextText);
        voiceTranscriptRef.current = nextText;
        setHasVoiceTranscript(true);
        setPendingTranscript("");
        if (voiceAutoDraftAfterChoiceRef.current) {
            voiceAutoDraftAfterChoiceRef.current = false;
            void runVoiceDraft(nextText, voiceGenerationRef.current, accountUserId);
        }
    };

    const getFieldGuidance = (field: "title" | "assignedTo" | "dueDate" | "priority") => {
        const matcher = field === "title"
            ? /title/i
            : field === "assignedTo"
                ? /team member|assignee|name/i
                : field === "dueDate"
                    ? /due date|deadline|date/i
                    : /priority/i;
        return draftClarifications.find((clarification) => matcher.test(clarification));
    };

    const closeModal = () => {
        if (isSubmitting) return;
        draftGenerationRef.current += 1;
        draftInFlightRef.current = false;
        setIsDrafting(false);
        cancelVoiceInput();
        onClose();
    };

    const handleFillTaskDetails = async () => {
        const description = draftDescription.trim();
        if (draftInFlightRef.current || description.length < 5 || description.length > 1000 || isLoadingEmployees) return;

        draftInFlightRef.current = true;
        const requestId = ++draftGenerationRef.current;
        const startingVersions = { ...fieldEditVersionsRef.current };
        const startingInstructionVersion = instructionEditVersionRef.current;
        setIsDrafting(true);
        setDraftError("");
        setDraftClarifications([]);

        try {
            const draft = await generateTaskDraft(description);
            if (requestId !== draftGenerationRef.current) return;
            if (instructionEditVersionRef.current !== startingInstructionVersion) {
                setDraftError("The instruction changed while filling details. Click Fill task details again to use the updated text.");
                return;
            }
            applyDraftFields(draft, startingVersions);
        } catch (error: unknown) {
            if (requestId !== draftGenerationRef.current) return;
            setDraftError(isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message || "Unable to fill task details. You can enter them manually."
                : "Unable to fill task details. You can enter them manually.");
        } finally {
            if (requestId === draftGenerationRef.current) {
                draftInFlightRef.current = false;
                setIsDrafting(false);
            }
        }
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const validationErrors =
            validate();

        setErrors(validationErrors);

        if (
            Object.keys(validationErrors)
                .length > 0 ||
            assignedTo === null
        ) {
            return;
        }

        // If the manager submits while drafting is still pending, ignore that late response.
        draftGenerationRef.current += 1;
        draftInFlightRef.current = false;
        setIsDrafting(false);
        cancelVoiceInput();

        try {
            setIsSubmitting(true);
            setSubmitError("");

            const payload = {
                title: title.trim(),
                assigned_to: assignedTo,
                due_date: dueDate || null,
                priority,
            };
            if (task) {
                await updateTask(task.id, payload);
            } else {
                await createTask(payload);
            }

            await onCreated();
            onClose();
        } catch (error) {
            const errorMessage = isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message || "Please try again."
                : "Please try again.";
            await Swal.fire({
                title: task ? "Unable to save task" : "Unable to create task",
                text: errorMessage,
                icon: "error",
                confirmButtonColor: "#2563EB",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const titleGuidance = getFieldGuidance("title");
    const assignedToGuidance = getFieldGuidance("assignedTo");
    const dueDateGuidance = getFieldGuidance("dueDate");
    const priorityGuidance = getFieldGuidance("priority");

    return (
        <Modal
            open={open}
            onClose={closeModal}
            title={task ? "Edit Task" : "Create Task"}
        >
            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
                noValidate
            >
                {submitError ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
                        {submitError}
                    </div>
                ) : null}

                {!task ? (
                    <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label htmlFor="taskDescription" className="block text-sm font-semibold text-[#0F172A]">
                                Describe the task
                            </label>
                            <div className="flex items-center gap-2">
                                <label htmlFor="transcriptionLanguage" className="sr-only">Transcription language</label>
                                <select
                                    id="transcriptionLanguage"
                                    aria-label="Transcription language"
                                    value={transcriptionLanguage}
                                    disabled={voiceState !== "idle" || isSubmitting || isDrafting}
                                    onChange={(event) => updateTranscriptionLanguage(event.target.value as TranscriptionLanguage)}
                                    className="h-9 rounded-lg border border-[#D8E2F0] bg-white px-2 text-xs font-medium text-[#334155] outline-none focus:border-[#2563EB] disabled:opacity-60"
                                >
                                    <option value="auto">Auto</option>
                                    <option value="hi">Hindi</option>
                                    <option value="en">English</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => voiceState === "recording" ? stopRecording() : void startRecording()}
                                    disabled={isSubmitting || isDrafting || (voiceState !== "idle" && voiceState !== "recording") || Boolean(pendingTranscript) || Boolean(pendingVoiceDraft)}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-[#1D4ED8] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    aria-label={voiceState === "recording" ? "Stop recording" : "Record task instruction"}
                                >
                                    {voiceState === "recording" ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
                                    {voiceState === "recording" ? "Stop" : voiceFailureStage === "transcription" ? "Retry recording" : "Record"}
                                </button>
                                {voiceState !== "idle" ? (
                                    <button type="button" onClick={() => cancelVoiceInput()} className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A]">Cancel</button>
                                ) : null}
                            </div>
                        </div>
                        <p className="mt-1 text-[11px] text-[#64748B]">This selects the spoken language, not the desired output language.</p>
                        {hasVoiceTranscript ? (
                            <details className="mt-3 rounded-lg border border-[#D8E2F0] bg-white px-3 py-2">
                                <summary className="cursor-pointer text-xs font-semibold text-[#334155]">Edit spoken instruction</summary>
                                <textarea
                                    id="taskDescription"
                                    value={draftDescription}
                                    onChange={(event) => {
                                        updateInstructionText(event.target.value);
                                        voiceTranscriptRef.current = event.target.value;
                                        setDraftError("");
                                    }}
                                    maxLength={1000}
                                    rows={3}
                                    className="mt-2 w-full resize-y rounded-lg border border-[#D8E2F0] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                                />
                            </details>
                        ) : (
                            <textarea
                                id="taskDescription"
                                value={draftDescription}
                                onChange={(event) => {
                                    updateInstructionText(event.target.value);
                                    setDraftError("");
                                }}
                                maxLength={1000}
                                rows={3}
                                placeholder="Manisha ko kal bank mein files submit karne hain, high priority."
                                className="mt-2 w-full resize-y rounded-xl border border-[#D8E2F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                            />
                        )}
                        {draftDescription.trim().length > 1000 ? (
                            <p className="mt-2 text-xs font-medium text-[#B91C1C]">Keep the instruction under 1,000 characters before filling task details.</p>
                        ) : null}
                        {voiceState === "requesting" ? (
                            <span className="mt-2 block text-xs text-[#64748B]" role="status">Waiting for microphone permission…</span>
                        ) : null}
                        {voiceState === "recording" ? (
                            <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-red-700" role="status" aria-live="polite">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> Listening {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")} / 01:00
                            </p>
                        ) : null}
                        {voiceFlowStarted ? (
                            <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-[#64748B]" role="status" aria-live="polite">
                                <span className={voiceProgress === "listening" ? "font-bold text-[#1D4ED8]" : ""}>Listening</span>
                                <span aria-hidden="true">→</span>
                                <span className={voiceProgress === "understanding" ? "font-bold text-[#1D4ED8]" : ""}>Understanding</span>
                                <span aria-hidden="true">→</span>
                                <span className={voiceProgress === "ready" ? "font-bold text-[#1D4ED8]" : ""}>Details ready</span>
                            </div>
                        ) : null}
                        {voiceState === "finalizing" || voiceState === "transcribing" || voiceState === "drafting" ? (
                            <p className="mt-1 text-xs text-[#64748B]" role="status">
                                {voiceState === "finalizing" ? "Preparing audio…" : "Understanding your instruction…"}
                            </p>
                        ) : null}
                        {VOICE_DIAGNOSTICS_ENABLED && recordedAudio ? (
                            <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-white p-2">
                                <p className="text-[10px] text-slate-500">Development diagnostic preview · {recordedAudio.mimeType} · task-instruction.{recordedAudio.extension} · {recordedAudio.blob.size.toLocaleString()} bytes</p>
                                <audio className="mt-1 w-full" controls src={recordedAudio.objectUrl} aria-label="Development-only recorded audio preview" />
                            </div>
                        ) : null}
                        {voiceError ? <p role="alert" className="mt-2 text-sm font-medium text-[#B91C1C]">{voiceError}</p> : null}
                        {pendingTranscript ? (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3" role="status">
                                <p className="text-xs font-semibold text-amber-900">Your instruction changed during recording. Replace it or append the transcript:</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{pendingTranscript}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => applyPendingTranscript("replace")} className="rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]">Replace</button>
                                    <button type="button" onClick={() => applyPendingTranscript("append")} className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100">Append</button>
                                    <button type="button" onClick={() => { setPendingTranscript(""); voiceAutoDraftAfterChoiceRef.current = false; }} className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-white">Discard</button>
                                </div>
                            </div>
                        ) : null}
                        {pendingVoiceDraft ? (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3" role="status">
                                <p className="text-xs text-amber-900">Your existing task details were kept. Applying this voice draft will replace them.</p>
                                <button type="button" onClick={applyPendingVoiceDraft} className="mt-2 h-9 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-[#1D4ED8]">Apply voice draft</button>
                            </div>
                        ) : null}
                        {voiceFailureStage === "draft" ? (
                            <button type="button" onClick={retryVoiceDraft} disabled={voiceState !== "idle"} className="mt-2 h-9 rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-[#1D4ED8] disabled:opacity-60">Retry filling details</button>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => void handleFillTaskDetails()}
                                disabled={isDrafting || isLoadingEmployees || voiceState !== "idle" || Boolean(pendingTranscript) || Boolean(pendingVoiceDraft) || draftDescription.trim().length < 5 || draftDescription.trim().length > 1000}
                                className="h-10 rounded-lg border border-blue-200 bg-white px-3.5 text-sm font-semibold text-[#1D4ED8] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isDrafting ? "Filling details..." : "Fill task details"}
                            </button>
                            <p className="text-xs text-[#475569]">Review the details before creating the task.</p>
                        </div>
                        {draftError ? <p role="alert" className="mt-2 text-sm font-medium text-[#B91C1C]">{draftError}</p> : null}
                        {transcriptionQualityWarning ? <p className="mt-2 text-xs text-amber-800" role="status">Transcription confidence was low. Review the spoken instruction.</p> : null}
                    </section>
                ) : null}

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="taskTitle"
                        className="text-sm font-semibold text-[#0F172A]"
                    >
                        Task title
                    </label>

                    <input
                        id="taskTitle"
                        type="text"
                        value={title}
                        onChange={(event) => {
                            fieldEditVersionsRef.current.title += 1;
                            setTitle(
                                event.target.value
                            );

                            setErrors(
                                (current) => ({
                                    ...current,
                                    title: undefined,
                                })
                            );
                        }}
                        placeholder="e.g. Site inspection"
                        disabled={isSubmitting}
                        className={
                            inputClassName
                        }
                    />

                    {errors.title ? (
                        <p className="text-xs font-medium text-[#EF4444]">
                            {errors.title}
                        </p>
                    ) : null}
                    {titleGuidance ? <p className="text-xs text-amber-800" role="status">{titleGuidance}</p> : null}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="taskPriority" className="text-sm font-semibold text-[#0F172A]">
                        Priority
                    </label>
                    <select
                        id="taskPriority"
                        value={priority}
                        disabled={isSubmitting}
                        onChange={(event) => {
                            fieldEditVersionsRef.current.priority += 1;
                            setPriority(event.target.value as TaskPriority);
                        }}
                        className={inputClassName}
                    >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                    {priorityGuidance ? <p className="text-xs text-amber-800" role="status">{priorityGuidance}</p> : null}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="assignedTo"
                        className="text-sm font-semibold text-[#0F172A]"
                    >
                        Assign to
                    </label>

                    <select
                        id="assignedTo"
                        value={assignedTo ?? ""}
                        disabled={
                            isLoadingEmployees ||
                            isSubmitting
                        }
                        onChange={(event) => {
                            fieldEditVersionsRef.current.assignedTo += 1;
                            setAssignedTo(
                                Number(
                                    event.target
                                        .value
                                ) || null
                            );

                            setErrors(
                                (current) => ({
                                    ...current,
                                    assignedTo:
                                        undefined,
                                })
                            );
                        }}
                        className={
                            inputClassName
                        }
                    >
                        <option
                            value=""
                            disabled
                        >
                            {isLoadingEmployees
                                ? "Loading employees..."
                                : "Select team member"}
                        </option>

                        {employees.map(
                            (employee) => (
                                <option
                                    key={
                                        employee.id
                                    }
                                    value={
                                        employee.id
                                    }
                                >
                                    {employee.full_name} — {employee.role === "manager" ? "Manager" : "Employee"}
                                </option>
                            )
                        )}
                    </select>

                    {errors.assignedTo ? (
                        <p className="text-xs font-medium text-[#EF4444]">
                            {
                                errors.assignedTo
                            }
                        </p>
                    ) : null}
                    {assignedToGuidance ? <p className="text-xs text-amber-800" role="status">{assignedToGuidance}</p> : null}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="dueDate"
                        className="text-sm font-semibold text-[#0F172A]"
                    >
                        Due date
                    </label>

                    <input
                        id="dueDate"
                        type="date"
                        min={getTodayDate()}
                        value={dueDate}
                        disabled={isSubmitting}
                        onChange={(event) => {
                            fieldEditVersionsRef.current.dueDate += 1;
                            setDueDate(
                                event.target.value
                            );

                            setErrors(
                                (current) => ({
                                    ...current,
                                    dueDate:
                                        undefined,
                                })
                            );
                        }}
                        className={
                            inputClassName
                        }
                    />

                    {errors.dueDate ? (
                        <p className="text-xs font-medium text-[#EF4444]">
                            {errors.dueDate}
                        </p>
                    ) : null}
                    {dueDateGuidance ? <p className="text-xs text-amber-800" role="status">{dueDateGuidance}</p> : null}
                </div>

                <div className="mt-2 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={closeModal}
                        disabled={isSubmitting}
                        className="h-11 rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#334155] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={
                            isSubmitting ||
                            isLoadingEmployees
                        }
                        className="h-11 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting
                            ? (task ? "Saving..." : "Creating...")
                            : (task ? "Save Changes" : "Create Task")}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
