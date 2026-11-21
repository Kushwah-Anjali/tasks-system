interface NotificationSoundControlProps {
    enabled: boolean;
    ready: boolean;
    blocked: boolean;
    onToggle: () => void;
    onMute: () => void;
}

export default function NotificationSoundControl({
    enabled,
    ready,
    blocked,
    onToggle,
    onMute,
}: NotificationSoundControlProps) {
    const isActive = enabled && ready;
    const buttonText = isActive ? "Mute sound" : "Enable sound";

    return (
        <div className="border-b border-[#E2E8F0] px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 flex-1 text-xs font-medium text-[#475569] [overflow-wrap:anywhere]">
                    {isActive ? "Notification sound is on" : blocked ? "Sound needs permission" : "Notification sound is off"}
                </p>
                <button
                    type="button"
                    onClick={onToggle}
                    className="min-h-11 shrink-0 rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC]"
                >
                    {buttonText}
                </button>
                {enabled && !ready ? (
                    <button type="button" onClick={onMute} className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155]">
                        Mute sound
                    </button>
                ) : null}
            </div>
            {blocked ? <p className="mt-1.5 text-[11px] leading-4 text-amber-700">Playback was blocked. Click Enable sound and allow audio in this tab.</p> : null}
            {enabled && !ready && !blocked ? <p className="mt-1.5 text-[11px] leading-4 text-[#64748B]">Click Enable sound to preview and activate it in this tab.</p> : null}
        </div>
    );
}
