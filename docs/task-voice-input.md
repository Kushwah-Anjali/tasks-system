# Voice input for task drafting

Voice input records an instruction. After Stop, the app transcribes it and fills the existing editable task fields. If the instruction box already has text, the manager chooses whether to replace or append before drafting. The transcript remains available in the collapsed “Edit spoken instruction” section. The manager reviews all fields and must click “Create Task” to save; recording, transcription, and drafting never create a task.

Microphone access requires HTTPS in production. Local development can use `localhost`, which browsers treat as a secure context. Recordings are limited to 60 seconds and are sent for transcription after the manager presses Stop (or the 60-second limit stops the recording). Cancel discards a recording without upload. Audio is processed in memory and is not saved as an application record.

The backend uses Groq’s multilingual `whisper-large-v3` transcription model by default. The compact language selector selects the spoken language (Auto, Hindi, or English), not the desired output language. Hindi is the default and the selection is remembered per user in this browser. Auto omits the language parameter. Transcription uses Groq’s transcription endpoint, not its translation endpoint. `GROQ_TRANSCRIPTION_MODEL` can override the model ID.

For local diagnostics only, set `VITE_TASK_VOICE_DIAGNOSTICS=true` in the client development environment and restart Vite. This enables a temporary audio playback preview with the recorder MIME type, filename extension, and byte size. It is disabled by default, available only in development, and the recording remains in browser memory until the form is cleared or closed. Do not enable this in a production build.
