import { useEffect } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';

/**
 * Restores a previously-chosen playback speed from sessionStorage when playback
 * starts (or the player changes). React reimplementation of the legacy
 * controller's updatePlaybackRate (index.js:1607-1613), which ran on every
 * NowPlayingItem state change.
 */
export function usePlaybackRateRestore() {
    useEffect(() => {
        let boundPlayer: unknown = null;

        const restore = () => {
            const player = playbackManager.getCurrentPlayer() as { setPlaybackRate?: (rate: string) => void } | null;
            if (!player?.setPlaybackRate) return;
            const playbackRateSpeed = sessionStorage.getItem('playbackRateSpeed');
            if (playbackRateSpeed !== null) {
                player.setPlaybackRate(playbackRateSpeed);
            }
        };

        const bind = () => {
            if (boundPlayer) {
                Events.off(boundPlayer, 'playbackstart', restore);
                boundPlayer = null;
            }
            boundPlayer = playbackManager.getCurrentPlayer();
            if (boundPlayer) {
                Events.on(boundPlayer, 'playbackstart', restore);
            }
        };

        const onPlayerChange = () => {
            bind();
            restore();
        };

        Events.on(playbackManager, 'playerchange', onPlayerChange);
        bind();
        restore();

        return () => {
            Events.off(playbackManager, 'playerchange', onPlayerChange);
            if (boundPlayer) {
                Events.off(boundPlayer, 'playbackstart', restore);
            }
        };
    }, []);
}
