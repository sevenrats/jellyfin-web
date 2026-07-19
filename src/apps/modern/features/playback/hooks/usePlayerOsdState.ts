import { useEffect, useState } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';

export interface PlayerOsdState {
    /** True when a player is active. */
    hasPlayer: boolean;
    isPaused: boolean;
    positionTicks: number;
    runtimeTicks: number;
    canSeek: boolean;
    /** Live streams with unknown runtime → rail-only (isClear). */
    isProgressClear: boolean;
    /** Buffered spans in ticks. */
    bufferedRanges: Array<{ start: number; end: number }>;
    /** The now-playing item (has Chapters, Name, RunTimeTicks, ServerId). */
    item: Record<string, unknown> | null;
    /** Player-supported commands (Mute, SetVolume, etc.). */
    supportedCommands: string[];
    /** True while the player is fetching/buffering (beginFetch..endFetch). */
    isFetching: boolean;
}

const EMPTY: PlayerOsdState = {
    hasPlayer: false,
    isPaused: false,
    positionTicks: 0,
    runtimeTicks: 0,
    canSeek: false,
    isProgressClear: false,
    bufferedRanges: [],
    item: null,
    supportedCommands: [],
    isFetching: false
};

function readState(): PlayerOsdState {
    const player = playbackManager.getCurrentPlayer();
    if (!player) return EMPTY;

    const state = playbackManager.getPlayerState(player);
    const playState = state.PlayState || {};
    const nowPlaying = state.NowPlayingItem || null;

    return {
        hasPlayer: true,
        isPaused: !!playState.IsPaused,
        positionTicks: playState.PositionTicks || 0,
        runtimeTicks: nowPlaying?.RunTimeTicks || 0,
        canSeek: !!playState.CanSeek,
        isProgressClear: !!(state.MediaSource && state.MediaSource.RunTimeTicks == null),
        bufferedRanges: playState.BufferedRanges || [],
        item: nowPlaying,
        supportedCommands: playbackManager.getSupportedCommands(player) || [],
        // beginFetch/endFetch flip this; seed from the player's current flag so a
        // fetch already in progress at mount shows the spinner (index.js:604-606).
        isFetching: !!(player as { isFetching?: boolean }).isFetching
    };
}

// The player events the OSD reacts to (index.js bindToPlayer, 591-601).
const PLAYER_EVENTS = [
    'playbackstart',
    'playbackstop',
    'volumechange',
    'pause',
    'unpause',
    'timeupdate',
    'fullscreenchange',
    'mediastreamschange',
    'beginFetch',
    'endFetch'
] as const;

/**
 * Reactive OSD player state. Generalizes usePlaybackProgress to the full set of
 * player events the video OSD subscribes to, exposing the fields the OSD renders
 * (position/runtime/paused/canSeek/buffered/item/supportedCommands).
 */
export function usePlayerOsdState(): PlayerOsdState {
    const [state, setState] = useState<PlayerOsdState>(readState);

    useEffect(() => {
        let boundPlayer: unknown = null;
        const update = () => setState(readState());

        const bindPlayerEvents = () => {
            if (boundPlayer) {
                PLAYER_EVENTS.forEach(evt => {
                    Events.off(boundPlayer, evt, update);
                });
                boundPlayer = null;
            }
            const player = playbackManager.getCurrentPlayer();
            if (player) {
                boundPlayer = player;
                PLAYER_EVENTS.forEach(evt => {
                    Events.on(player, evt, update);
                });
            }
        };

        const onPlayerChange = () => {
            bindPlayerEvents();
            update();
        };

        Events.on(playbackManager, 'playerchange', onPlayerChange);
        bindPlayerEvents();
        update();

        return () => {
            Events.off(playbackManager, 'playerchange', onPlayerChange);
            if (boundPlayer) {
                PLAYER_EVENTS.forEach(evt => {
                    Events.off(boundPlayer, evt, update);
                });
            }
        };
    }, []);

    return state;
}
