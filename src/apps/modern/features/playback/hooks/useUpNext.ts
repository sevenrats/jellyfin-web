import { useEffect, useRef } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import * as userSettings from 'scripts/settings/userSettings';
import Events from 'utils/events';

const TICKS_PER_SECOND = 10000000;
const TICKS_PER_MINUTE = 60 * TICKS_PER_SECOND;

// Show-at threshold from the legacy OSD (index.js:658-671): later for longer items.
function showAtTicks(runtimeTicks: number): number {
    let secondsLeft = 30;
    if (runtimeTicks >= 50 * TICKS_PER_MINUTE) secondsLeft = 40;
    else if (runtimeTicks >= 40 * TICKS_PER_MINUTE) secondsLeft = 35;
    return runtimeTicks - secondsLeft * TICKS_PER_SECOND;
}

/**
 * "Coming up next" overlay. Watches playback position and, near the end of an
 * Episode, island-mounts the vanilla UpNextDialog into `container`. Mirrors the
 * legacy showComingUpNextIfNeeded (index.js:658-696).
 */
export function useUpNext(container: React.RefObject<HTMLElement>) {
    // Per-item guard so the dialog only appears once per playback.
    const shownForItem = useRef<string | null>(null);
    const dialogRef = useRef<{ destroy?: () => void } | null>(null);

    useEffect(() => {
        let boundPlayer: unknown = null;

        const clearDialog = () => {
            dialogRef.current?.destroy?.();
            dialogRef.current = null;
        };

        const maybeShow = () => {
            const player = playbackManager.getCurrentPlayer();
            if (!player || dialogRef.current) return;
            if (!userSettings.enableNextVideoInfoOverlay?.()) return;

            const item = playbackManager.currentItem(player);
            if (!item || item.Type !== 'Episode') return;
            if (shownForItem.current === item.Id) return;

            const runtimeTicks = playbackManager.duration(player);
            const positionTicks = playbackManager.getCurrentTicks(player);
            if (!runtimeTicks || !positionTicks) return;

            const timeRemaining = runtimeTicks - positionTicks;
            if (positionTicks >= showAtTicks(runtimeTicks)
                && runtimeTicks >= 10 * TICKS_PER_MINUTE
                && timeRemaining >= 20 * TICKS_PER_SECOND) {
                shownForItem.current = item.Id;
                mountDialog(player);
            }
        };

        const mountDialog = (player: unknown) => {
            playbackManager.nextItem(player).then(async (nextItem: unknown) => {
                const parent = container.current;
                if (!parent) return;
                const { default: UpNextDialog } = await import('components/upnextdialog/upnextdialog');
                if (!container.current) return;
                const dialog = new UpNextDialog({ parent, player, nextItem });
                dialogRef.current = dialog;
                Events.on(dialog, 'hide', clearDialog);
            }, () => { /* no next item */ });
        };

        const onTimeUpdate = () => maybeShow();
        const resetForNewItem = () => {
            shownForItem.current = null;
            clearDialog();
        };

        const bind = () => {
            if (boundPlayer) {
                Events.off(boundPlayer, 'timeupdate', onTimeUpdate);
                Events.off(boundPlayer, 'playbackstart', resetForNewItem);
                boundPlayer = null;
            }
            boundPlayer = playbackManager.getCurrentPlayer();
            if (boundPlayer) {
                Events.on(boundPlayer, 'timeupdate', onTimeUpdate);
                Events.on(boundPlayer, 'playbackstart', resetForNewItem);
            }
        };
        const onPlayerChange = () => {
            bind();
            resetForNewItem();
        };

        Events.on(playbackManager, 'playerchange', onPlayerChange);
        bind();

        return () => {
            Events.off(playbackManager, 'playerchange', onPlayerChange);
            if (boundPlayer) {
                Events.off(boundPlayer, 'timeupdate', onTimeUpdate);
                Events.off(boundPlayer, 'playbackstart', resetForNewItem);
            }
            clearDialog();
        };
    }, [container]);
}
