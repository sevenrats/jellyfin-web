import { useCallback, useEffect, useRef, useState } from 'react';

import { EventType } from 'constants/eventType';
import Events from 'utils/events';

// Matches the legacy OSD idle hide delay (index.js:296).
const OSD_HIDE_DELAY_MS = 3000;

export interface OsdVisibility {
    visible: boolean;
    /** Show the OSD and (re)start the idle hide timer. */
    show: () => void;
    /** Hide the OSD immediately. */
    hide: () => void;
    /** Toggle between shown/hidden. */
    toggle: () => void;
}

/**
 * OSD show/hide with an idle auto-hide timer, plus auto-show on pointer/key
 * activity within `targetRef`. React reimplementation of the legacy OSD
 * fade/idle logic (index.js:272-408). Styling/animation is left to the
 * consuming component (the legacy version slid the header DOM directly).
 */
export function useOsdVisibility(
    targetRef: React.RefObject<HTMLElement>,
    { startVisible = true }: { startVisible?: boolean } = {}
): OsdVisibility {
    const [visible, setVisible] = useState(startVisible);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = undefined;
        }
    }, []);

    const hide = useCallback(() => {
        clearTimer();
        setVisible(false);
    }, [clearTimer]);

    const show = useCallback(() => {
        setVisible(true);
        clearTimer();
        timerRef.current = setTimeout(() => setVisible(false), OSD_HIDE_DELAY_MS);
    }, [clearTimer]);

    const toggle = useCallback(() => {
        setVisible(prev => {
            if (prev) {
                clearTimer();
                return false;
            }
            clearTimer();
            timerRef.current = setTimeout(() => setVisible(false), OSD_HIDE_DELAY_MS);
            return true;
        });
    }, [clearTimer]);

    // Broadcast visibility so the video route header (VideoPage) and skip-segment
    // overlay track the OSD. Replaces the legacy controller's SHOW_VIDEO_OSD
    // triggers in showOsd/hideOsd (index.js:273/280).
    useEffect(() => {
        Events.trigger(document, EventType.SHOW_VIDEO_OSD, [visible]);
    }, [visible]);

    // Start the idle timer on mount when starting visible.
    useEffect(() => {
        if (startVisible) show();
        return clearTimer;
    }, [startVisible, show, clearTimer]);

    // Auto-show on pointer/key activity over the target.
    useEffect(() => {
        const el = targetRef.current;
        if (!el) return;

        const onActivity = () => show();
        el.addEventListener('pointermove', onActivity);
        el.addEventListener('pointerdown', onActivity);
        el.addEventListener('keydown', onActivity);

        return () => {
            el.removeEventListener('pointermove', onActivity);
            el.removeEventListener('pointerdown', onActivity);
            el.removeEventListener('keydown', onActivity);
        };
    }, [targetRef, show]);

    return { visible, show, hide, toggle };
}
