import { useCallback, useEffect, useRef, useState } from "react";

import {
    getNotifications,
    markAllNotificationsRead as markAllNotificationsReadRequest,
    markNotificationRead as markNotificationReadRequest,
} from "../services/notificationService";
import type { AppNotification } from "../types/notification";

const POLL_INTERVAL_MS = 15000;
const CLAIM_RETENTION_MS = 24 * 60 * 60 * 1000;
const CLAIM_MAX_IDS = 100;

type NotificationAudioContext = AudioContext;
type SoundClaim = { id: number; at: number }[];

const readSoundPreference = (userId: number): boolean => {
    try {
        return window.localStorage.getItem(`notification-sound-enabled:${userId}`) === "true";
    } catch {
        return false;
    }
};

const playTone = (context: NotificationAudioContext): void => {
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.075, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.34);
};

const claimNewNotificationIds = (userId: number, ids: number[]): boolean => {
    const key = `notification-sound-played:${userId}`;
    const now = Date.now();
    try {
        const saved = window.localStorage.getItem(key);
        const claims = saved ? JSON.parse(saved) as SoundClaim : [];
        const recentClaims = Array.isArray(claims)
            ? claims.filter((claim) => Number.isSafeInteger(claim?.id) && now - claim.at < CLAIM_RETENTION_MS)
            : [];
        const seenIds = new Set(recentClaims.map((claim) => claim.id));
        const unseenIds = ids.filter((id) => !seenIds.has(id));
        if (unseenIds.length === 0) return false;

        const nextClaims = [
            ...recentClaims,
            ...unseenIds.map((id) => ({ id, at: now })),
        ].slice(-CLAIM_MAX_IDS);
        window.localStorage.setItem(key, JSON.stringify(nextClaims));
        return true;
    } catch {
        // If browser storage is unavailable, suppress sound rather than risk duplicates across tabs.
        return false;
    }
};

export interface NotificationCenter {
    notifications: AppNotification[];
    unreadCount: number;
    loading: boolean;
    error: string;
    soundEnabled: boolean;
    soundReady: boolean;
    soundBlocked: boolean;
    refresh: () => Promise<void>;
    markRead: (notification: AppNotification) => Promise<boolean>;
    markAllRead: () => Promise<boolean>;
    toggleSound: () => Promise<void>;
    muteSound: () => Promise<void>;
}

export const useNotificationCenter = (userId: number): NotificationCenter => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(() => readSoundPreference(userId));
    const [soundReady, setSoundReady] = useState(false);
    const [soundBlocked, setSoundBlocked] = useState(false);
    const enabledRef = useRef(soundEnabled);
    const readyRef = useRef(false);
    const blockedRef = useRef(false);
    const contextRef = useRef<NotificationAudioContext | null>(null);
    const knownIdsRef = useRef<Set<number> | null>(null);
    const mountedRef = useRef(false);
    const inFlightRef = useRef(false);

    const updateSoundState = (enabled: boolean, ready: boolean, blocked: boolean) => {
        enabledRef.current = enabled;
        readyRef.current = ready;
        blockedRef.current = blocked;
        setSoundEnabled(enabled);
        setSoundReady(ready);
        setSoundBlocked(blocked);
    };

    const getAudioContext = (): NotificationAudioContext => {
        if (contextRef.current) return contextRef.current;
        const context = new window.AudioContext();
        contextRef.current = context;
        return context;
    };

    const playNewNotificationSound = useCallback(async (ids: number[]) => {
        if (!enabledRef.current || blockedRef.current || ids.length === 0) return;

        try {
            const context = getAudioContext();
            if (context.state !== "running") await context.resume();
            if (context.state !== "running") {
                updateSoundState(true, false, true);
                return;
            }

            if (!claimNewNotificationIds(userId, ids)) return;
            playTone(context);
            updateSoundState(true, true, false);
        } catch {
            updateSoundState(true, false, true);
        }
    }, [userId]);

    const refresh = useCallback(async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;

        try {
            const data = await getNotifications();
            if (!mountedRef.current) return;

            const incomingIds = new Set(data.notifications.map((notification) => notification.id));
            if (knownIdsRef.current === null) {
                // The first successful fetch after login/reload is a silent baseline.
                knownIdsRef.current = incomingIds;
            } else {
                const newNotifications = data.notifications.filter((notification) => !knownIdsRef.current?.has(notification.id));
                for (const notification of data.notifications) knownIdsRef.current.add(notification.id);
                if (newNotifications.length > 0) {
                    await playNewNotificationSound(newNotifications.map((notification) => notification.id));
                }
            }

            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
            setError("");
        } catch {
            if (mountedRef.current) setError("Unable to load notifications. Please try again.");
        } finally {
            inFlightRef.current = false;
            if (mountedRef.current) setLoading(false);
        }
    }, [playNewNotificationSound]);

    useEffect(() => {
        mountedRef.current = true;
        void refresh();

        const refreshIfVisible = () => {
            if (document.visibilityState === "visible") void refresh();
        };
        const interval = window.setInterval(refreshIfVisible, POLL_INTERVAL_MS);
        window.addEventListener("focus", refreshIfVisible);
        document.addEventListener("visibilitychange", refreshIfVisible);

        return () => {
            mountedRef.current = false;
            window.clearInterval(interval);
            window.removeEventListener("focus", refreshIfVisible);
            document.removeEventListener("visibilitychange", refreshIfVisible);
            knownIdsRef.current = null;
            if (contextRef.current) {
                void contextRef.current.close().catch(() => undefined);
                contextRef.current = null;
            }
        };
    }, [refresh]);

    useEffect(() => {
        const key = `notification-sound-enabled:${userId}`;
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== key) return;
            const enabled = event.newValue === "true";
            if (!enabled && contextRef.current) void contextRef.current.suspend().catch(() => undefined);
            updateSoundState(enabled, false, false);
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [userId]);

    const muteSound = useCallback(async () => {
        try {
            window.localStorage.setItem(`notification-sound-enabled:${userId}`, "false");
        } catch {
            // The in-memory preference still applies for this session.
        }
        updateSoundState(false, false, false);
        if (contextRef.current) await contextRef.current.suspend().catch(() => undefined);
    }, [userId]);

    const toggleSound = useCallback(async () => {
        if (enabledRef.current && readyRef.current) {
            await muteSound();
            return;
        }

        try {
            window.localStorage.setItem(`notification-sound-enabled:${userId}`, "true");
        } catch {
            // Keep the preference in memory if browser storage is unavailable.
        }
        updateSoundState(true, false, false);

        try {
            const context = getAudioContext();
            await context.resume();
            if (context.state !== "running") throw new Error("Audio playback is blocked.");
            playTone(context);
            updateSoundState(true, true, false);
        } catch {
            updateSoundState(true, false, true);
        }
    }, [muteSound, userId]);

    const markRead = useCallback(async (notification: AppNotification): Promise<boolean> => {
        if (notification.is_read === 1) return true;
        try {
            await markNotificationReadRequest(notification.id);
            setNotifications((current) => current.map((item) => item.id === notification.id
                ? { ...item, is_read: 1, read_at: new Date().toISOString() }
                : item));
            setUnreadCount((current) => Math.max(0, current - 1));
            setError("");
            return true;
        } catch {
            setError("Unable to mark this notification as read. Please try again.");
            return false;
        }
    }, []);

    const markAllRead = useCallback(async (): Promise<boolean> => {
        try {
            await markAllNotificationsReadRequest();
            setNotifications((current) => current.map((notification) => ({ ...notification, is_read: 1 })));
            setUnreadCount(0);
            setError("");
            return true;
        } catch {
            setError("Unable to mark notifications as read. Please try again.");
            return false;
        }
    }, []);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        soundEnabled,
        soundReady,
        soundBlocked,
        refresh,
        markRead,
        markAllRead,
        toggleSound,
        muteSound,
    };
};
