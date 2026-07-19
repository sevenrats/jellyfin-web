import { useEffect } from 'react';

// A pointer that moves less than this (px) between down and up is a tap, not a swipe.
const TAP_SLOP_PX = 10;
// Minimum horizontal travel (px) to count as a seek swipe.
const SWIPE_THRESHOLD_PX = 40;

interface UseOsdGesturesOptions {
    /** Tap on the video surface → toggle the OSD. */
    onTap: () => void;
    /**
     * Horizontal swipe → seek. `deltaFraction` is the swipe distance as a
     * fraction of the surface width (positive = right/forward).
     */
    onSwipeSeek: (deltaFraction: number) => void;
}

/**
 * Fresh React gesture hook for the video surface: tap-to-toggle-OSD and
 * horizontal swipe-to-seek. Replaces the legacy pointer/touch tap wiring
 * (index.js window mouse/touch handlers); pointer-move-to-show is handled by
 * useOsdVisibility.
 */
export function useOsdGestures(
    targetRef: React.RefObject<HTMLElement>,
    { onTap, onSwipeSeek }: UseOsdGesturesOptions
) {
    useEffect(() => {
        const el = targetRef.current;
        if (!el) return;

        let startX = 0;
        let startY = 0;
        let tracking = false;

        const onPointerDown = (e: PointerEvent) => {
            // Ignore presses on interactive controls (buttons, sliders).
            if ((e.target as HTMLElement).closest('button, input, [role="slider"]')) {
                tracking = false;
                return;
            }
            tracking = true;
            startX = e.clientX;
            startY = e.clientY;
        };

        const onPointerUp = (e: PointerEvent) => {
            if (!tracking) return;
            tracking = false;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Mostly-horizontal travel past the threshold → seek.
            if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
                const width = el.getBoundingClientRect().width || 1;
                onSwipeSeek(dx / width);
                return;
            }

            // Negligible movement → tap.
            if (Math.abs(dx) < TAP_SLOP_PX && Math.abs(dy) < TAP_SLOP_PX) {
                onTap();
            }
        };

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointerup', onPointerUp);

        return () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointerup', onPointerUp);
        };
    }, [targetRef, onTap, onSwipeSeek]);
}
