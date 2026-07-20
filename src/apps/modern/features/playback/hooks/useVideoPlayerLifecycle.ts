import { useEffect, useRef } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import { setBackdropTransparency, TRANSPARENCY_LEVEL } from 'components/backdrop/backdrop';
import { appRouter } from 'components/router/appRouter';
import shell from 'scripts/shell';
import Events from 'utils/events';

/**
 * Owns the video page's imperative lifecycle (ported from the retired legacy
 * video controller's thin host). Runs once per page mount:
 *
 *  - on mount: enter fullscreen, make the backdrop fully transparent, and bind
 *    to the active player (re-binding on `playerchange`);
 *  - back-on-non-video-next: when playback stops and the next item isn't video,
 *    navigate back (and mark that we did, so unmount doesn't also stop);
 *  - stop-on-back (unmount): if still playing video, leave fullscreen and stop
 *    the player — the React cleanup is the equivalent of the old view's
 *    `viewbeforehide` stop-on-back;
 *  - error path: reset the backdrop and go home.
 */
export function useVideoPlayerLifecycle(): void {
    // A natural playbackstop that navigates back sets this so the unmount
    // cleanup doesn't stop the (already-stopped) player a second time.
    const stoppedByPlaybackRef = useRef(false);

    useEffect(() => {
        let currentPlayer: unknown = null;

        const onPlaybackStopped = (_e: unknown, state: { NextMediaType?: string }) => {
            if (state.NextMediaType !== 'Video') {
                stoppedByPlaybackRef.current = true;
                void appRouter.back();
            }
        };

        const bindToPlayer = (player: unknown) => {
            if (player === currentPlayer) return;
            releaseCurrentPlayer();
            currentPlayer = player;
            if (!player) return;
            Events.on(player, 'playbackstop', onPlaybackStopped);
        };

        function releaseCurrentPlayer() {
            if (currentPlayer) {
                Events.off(currentPlayer, 'playbackstop', onPlaybackStopped);
                currentPlayer = null;
            }
        }

        const onPlayerChange = () => bindToPlayer(playbackManager.getCurrentPlayer());

        try {
            shell.enableFullscreen();
            setBackdropTransparency(TRANSPARENCY_LEVEL.Full);
            Events.on(playbackManager, 'playerchange', onPlayerChange);
            bindToPlayer(playbackManager.getCurrentPlayer());
        } catch {
            setBackdropTransparency(TRANSPARENCY_LEVEL.None);
            void appRouter.goHome();
        }

        return () => {
            Events.off(playbackManager, 'playerchange', onPlayerChange);
            const player = currentPlayer;
            releaseCurrentPlayer();

            // Stop-on-back: only when navigating away while still playing video,
            // and not when a natural playbackstop already took us back.
            if (!stoppedByPlaybackRef.current && playbackManager.isPlayingVideo()) {
                shell.disableFullscreen();
                playbackManager.stop(player);
            }
        };
    }, []);
}
