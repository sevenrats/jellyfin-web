import { useMemo } from 'react';
import type { TrickplayInfoDto } from '@jellyfin/sdk/lib/generated-client/models/trickplay-info-dto';

// Trickplay tiers keyed by their thumbnail width, as they appear on the item
// (item.Trickplay[mediaSourceId]).
type TrickplayResolutions = Record<string, TrickplayInfoDto>;

/**
 * Picks the trickplay tier to show in the seek bubble: the highest-resolution
 * tier whose thumbnail width is <= 20% of the physical screen width. Ported
 * from the legacy OSD's updateDisplayItem (index.js ~141-158).
 */
export function useTrickplayResolution(
    trickplay: Record<string, TrickplayResolutions> | null | undefined,
    mediaSourceId: string | null
): TrickplayInfoDto | null {
    return useMemo(() => {
        if (!trickplay || !mediaSourceId) return null;

        const resolutions = trickplay[mediaSourceId];
        if (!resolutions) return null;

        // Prefer highest resolution <= 20% of total screen resolution width.
        const maxWidth = window.screen.width * window.devicePixelRatio * 0.2;
        let bestWidth: number | undefined;
        for (const info of Object.values(resolutions)) {
            const width = info.Width;
            if (width == null) continue;
            // Objects aren't guaranteed sorted, so the first width might be > maxWidth.
            if (bestWidth == null
                    || (width < bestWidth && bestWidth > maxWidth)
                    || (width > bestWidth && width <= maxWidth)) {
                bestWidth = width;
            }
        }

        return bestWidth != null ? resolutions[bestWidth] : null;
    }, [trickplay, mediaSourceId]);
}
