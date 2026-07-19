import { useEffect, useState } from 'react';

import { appHost } from 'components/apphost';
import { playbackManager } from 'components/playback/playbackmanager';
import { AppFeature } from 'constants/appFeature';
import Events from 'utils/events';

export interface PlayerVolumeState {
    volume: number;
    isMuted: boolean;
    showMuteButton: boolean;
    showVolumeSlider: boolean;
}

const EMPTY: PlayerVolumeState = { volume: 0, isMuted: false, showMuteButton: false, showVolumeSlider: false };

function readVolume(): PlayerVolumeState {
    const player = playbackManager.getCurrentPlayer();
    if (!player) return EMPTY;

    const state = playbackManager.getPlayerState(player);
    const playState = state.PlayState || {};
    const supported = playbackManager.getSupportedCommands(player) || [];

    let showMuteButton = supported.indexOf('Mute') !== -1;
    let showVolumeSlider = supported.indexOf('SetVolume') !== -1;

    // The device's own volume keys handle it → hide the in-app controls.
    if (player.isLocalPlayer && appHost.supports(AppFeature.PhysicalVolumeControl)) {
        showMuteButton = false;
        showVolumeSlider = false;
    }

    return {
        volume: playState.VolumeLevel || 0,
        isMuted: !!playState.IsMuted,
        showMuteButton,
        showVolumeSlider
    };
}

const VOLUME_EVENTS = ['volumechange', 'playbackstart', 'playbackstop'] as const;

/** Reactive volume/mute state + whether the OSD volume controls should show. */
export function usePlayerVolume(): PlayerVolumeState {
    const [state, setState] = useState<PlayerVolumeState>(readVolume);

    useEffect(() => {
        let boundPlayer: unknown = null;
        const update = () => setState(readVolume());

        const bind = () => {
            if (boundPlayer) {
                VOLUME_EVENTS.forEach(evt => {
                    Events.off(boundPlayer, evt, update);
                });
                boundPlayer = null;
            }
            const player = playbackManager.getCurrentPlayer();
            if (player) {
                boundPlayer = player;
                VOLUME_EVENTS.forEach(evt => {
                    Events.on(player, evt, update);
                });
            }
        };

        const onPlayerChange = () => {
            bind();
            update();
        };

        Events.on(playbackManager, 'playerchange', onPlayerChange);
        bind();
        update();

        return () => {
            Events.off(playbackManager, 'playerchange', onPlayerChange);
            if (boundPlayer) {
                VOLUME_EVENTS.forEach(evt => {
                    Events.off(boundPlayer, evt, update);
                });
            }
        };
    }, []);

    return state;
}
