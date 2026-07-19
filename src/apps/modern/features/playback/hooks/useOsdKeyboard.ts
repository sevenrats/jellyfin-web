import { useEffect } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import layoutManager from 'components/layoutManager';
import { getKeyName, isNavigationKey } from 'scripts/keyboardNavigation';

interface UseOsdKeyboardOptions {
    /** Reveal the OSD (resets the idle timer). */
    show: () => void;
    /** Hide the OSD (Escape/Back when shown). */
    hide: () => void;
    /** Whether the OSD is currently visible (affects Escape/Back). */
    isVisible: () => boolean;
    /** H: nudge the subtitle offset later (subtitlesync). */
    incrementOffset?: () => void;
    /** G: nudge the subtitle offset earlier (subtitlesync). */
    decrementOffset?: () => void;
}

type Ctx = { player: unknown; show: () => void };
type Action = (ctx: Ctx) => void;

const player = () => playbackManager.getCurrentPlayer();

/**
 * A key entry: which action, whether it requires Shift, and whether it reveals
 * the OSD. `shift: false` means "ignore when Shift held"; `shift: true` means
 * "only when Shift held".
 */
interface KeyEntry {
    action: Action;
    shift: boolean;
    reveal?: boolean;
}

const entry = (action: Action, shift = false, reveal = false): KeyEntry => ({ action, shift, reveal });

// Ready subset of the legacy onKeyDown (index.js:1215-1421). getKeyName
// normalizes NavigationLeft/GamepadDPad* to Arrow* names. Deferred: KeyG/KeyH
// subtitle offset (subtitlesync, B4); Comma/Period frame-step (no seekFrames —
// only the Shift rate-change is kept).
const KEY_ENTRIES: Record<string, KeyEntry> = {
    KeyK: entry(({ player: p }) => playbackManager.playPause(p), false, true),
    KeyJ: entry(({ player: p }) => playbackManager.rewind(p), false, true),
    ArrowLeft: entry(({ player: p }) => playbackManager.rewind(p), false, true),
    KeyL: entry(({ player: p }) => playbackManager.fastForward(p), false, true),
    ArrowRight: entry(({ player: p }) => playbackManager.fastForward(p), false, true),
    ArrowUp: entry(({ player: p }) => playbackManager.volumeUp(p)),
    ArrowDown: entry(({ player: p }) => playbackManager.volumeDown(p)),
    KeyF: entry(({ player: p }) => playbackManager.toggleFullscreen(p)),
    KeyM: entry(({ player: p }) => playbackManager.toggleMute(undefined, p)),
    KeyP: entry(({ player: p }) => playbackManager.previousTrack(p), true),
    KeyN: entry(({ player: p }) => playbackManager.nextTrack(p), true),
    Comma: entry(({ player: p }) => playbackManager.decreasePlaybackRate(p), true),
    Period: entry(({ player: p }) => playbackManager.increasePlaybackRate(p), true),
    Home: entry(({ player: p }) => playbackManager.seekPercent(0, p)),
    End: entry(({ player: p }) => playbackManager.seekPercent(100, p)),
    PageUp: entry(({ player: p }) => playbackManager.nextChapter(p)),
    PageDown: entry(({ player: p }) => playbackManager.previousChapter(p)),
    Enter: entry(({ show }) => show(), false, true)
};

function runEntry(key: string, e: KeyboardEvent, p: unknown, show: () => void): boolean {
    const found = KEY_ENTRIES[key];
    if (!found || found.shift !== e.shiftKey) return false;
    e.preventDefault();
    found.action({ player: p, show });
    if (found.reveal) show();
    return true;
}

// Number keys 0-9 → seek to N*10%.
function runDigit(key: string, p: unknown): boolean {
    if (!key.startsWith('Digit') && !key.startsWith('Numpad')) return false;
    const num = parseInt(key.replace('Digit', '').replace('Numpad', ''), 10);
    if (isNaN(num) || num < 0 || num > 9) return false;
    playbackManager.seekPercent(num * 10, p);
    return true;
}

// G/H: subtitle offset earlier/later (subtitlesync).
function handleOffsetKey(key: string, e: KeyboardEvent, o: UseOsdKeyboardOptions): boolean {
    if (e.shiftKey || (key !== 'KeyG' && key !== 'KeyH')) return false;
    e.preventDefault();
    if (key === 'KeyG') o.decrementOffset?.();
    else o.incrementOffset?.();
    return true;
}

// Space: play/pause unless focused on a TV button; always reveals the OSD.
function handleSpaceKey(key: string, e: KeyboardEvent, p: unknown, o: UseOsdKeyboardOptions): boolean {
    if (key !== 'Space') return false;
    const isTvButton = (e.target as HTMLElement).tagName === 'BUTTON' && layoutManager.tv;
    if (!isTvButton) {
        e.preventDefault();
        e.stopPropagation();
        playbackManager.playPause(p);
    }
    o.show();
    return true;
}

// Escape/Back hides the OSD when visible.
function handleDismissKey(key: string, e: KeyboardEvent, o: UseOsdKeyboardOptions): boolean {
    if (key !== 'Escape' && key !== 'Back') return false;
    if (o.isVisible()) {
        o.hide();
        e.stopPropagation();
    }
    return true;
}

/**
 * Handle the keys with bespoke rules (not in KEY_ENTRIES). Returns true if the
 * key was consumed. Kept split into small helpers to bound complexity.
 */
function handleSpecialKey(key: string, e: KeyboardEvent, p: unknown, o: UseOsdKeyboardOptions): boolean {
    if (handleOffsetKey(key, e, o)) return true;
    if (handleSpaceKey(key, e, p, o)) return true;
    if (handleDismissKey(key, e, o)) return true;
    // On TV, navigation keys just reveal the OSD.
    if (layoutManager.tv && isNavigationKey(key)) {
        if (!e.shiftKey) o.show();
        return true;
    }
    if (runDigit(key, p)) {
        o.show();
        return true;
    }
    return false;
}

/** Ports the ready subset of the legacy OSD keyboard handling. */
export function useOsdKeyboard(opts: UseOsdKeyboardOptions) {
    const { show, hide, isVisible, incrementOffset, decrementOffset } = opts;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            const p = player();
            if (!p) return;

            const key = getKeyName(e);

            // When a range input (the position slider) is focused, let its own
            // handler own Left/Right so it can stage a seek and show the preview
            // dot (jf-slider stage mode). Don't disturb other OSD keys.
            if ((key === 'ArrowLeft' || key === 'ArrowRight')
                && (e.target as HTMLElement).matches?.('input[type="range"]')) {
                return;
            }

            if (handleSpecialKey(key, e, p, opts)) return;
            runEntry(key, e, p, show);
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
        // opts is stable per render via the destructured callbacks below.
    }, [opts, show, hide, isVisible, incrementOffset, decrementOffset]);
}
