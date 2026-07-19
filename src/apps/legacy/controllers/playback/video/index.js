import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';
import shell from 'scripts/shell';
import { appRouter } from 'components/router/appRouter';
import { setBackdropTransparency, TRANSPARENCY_LEVEL } from 'components/backdrop/backdrop';

/**
 * Thin lifecycle host for the video player page.
 *
 * The OSD itself is the React `VideoOsd` (src/apps/modern/features/playback),
 * mounted into `.reactVideoOsdMount`. This controller no longer renders or
 * manages any controls — it only provides the view lifecycle the React OSD
 * relies on the view-manager for: backdrop transparency, fullscreen shell,
 * player binding for stop-on-back / back-on-non-video-next, error → goHome,
 * and mounting/unmounting the React OSD.
 *
 * Title, OSD visibility (SHOW_VIDEO_OSD), playback-rate restore, transport,
 * menus, keyboard/gesture handling, up-next, SyncPlay icon and stats are all
 * owned by the React OSD and its hooks.
 */
export default function (view) {
    let currentPlayer;
    let reactOsdCleanup = null;

    function onPlaybackStopped(e, state) {
        if (state.NextMediaType !== 'Video') {
            view.removeEventListener('viewbeforehide', onViewHideStopPlayback);
            appRouter.back();
        }
    }

    function onStateChanged(event, state) {
        if (state.NowPlayingItem) {
            enableStopOnBack(true);
        }
    }

    function onPlaybackStart(e, state) {
        onStateChanged.call(this, e, state);
    }

    function bindToPlayer(player) {
        if (player !== currentPlayer) {
            releaseCurrentPlayer();
            currentPlayer = player;
            if (!player) return;
        }

        const state = playbackManager.getPlayerState(player);
        onStateChanged.call(player, { type: 'init' }, state);
        Events.on(player, 'playbackstart', onPlaybackStart);
        Events.on(player, 'playbackstop', onPlaybackStopped);
    }

    function releaseCurrentPlayer() {
        const player = currentPlayer;

        if (player) {
            Events.off(player, 'playbackstart', onPlaybackStart);
            Events.off(player, 'playbackstop', onPlaybackStopped);
            currentPlayer = null;
        }
    }

    function onPlayerChange() {
        bindToPlayer(playbackManager.getCurrentPlayer());
    }

    function onViewHideStopPlayback() {
        if (playbackManager.isPlayingVideo()) {
            shell.disableFullscreen();

            const player = currentPlayer;
            view.removeEventListener('viewbeforehide', onViewHideStopPlayback);
            releaseCurrentPlayer();
            playbackManager.stop(player);
        }
    }

    function enableStopOnBack(enabled) {
        view.removeEventListener('viewbeforehide', onViewHideStopPlayback);

        if (enabled && playbackManager.isPlayingVideo(currentPlayer)) {
            view.addEventListener('viewbeforehide', onViewHideStopPlayback);
        }
    }

    shell.enableFullscreen();

    view.addEventListener('viewbeforeshow', function () {
        setBackdropTransparency(TRANSPARENCY_LEVEL.Full);
    });

    view.addEventListener('viewshow', function () {
        try {
            Events.on(playbackManager, 'playerchange', onPlayerChange);
            bindToPlayer(playbackManager.getCurrentPlayer());

            if (!reactOsdCleanup) {
                const mount = view.querySelector('.reactVideoOsdMount');
                if (mount) {
                    Promise.all([
                        import('utils/reactUtils'),
                        import('apps/modern/features/playback/components/VideoOsd')
                    ]).then(([{ renderComponent }, { default: VideoOsd }]) => {
                        reactOsdCleanup = renderComponent(VideoOsd, {}, mount);
                    });
                }
            }
        } catch {
            setBackdropTransparency(TRANSPARENCY_LEVEL.None); // reset state set in viewbeforeshow
            appRouter.goHome();
        }
    });

    view.addEventListener('viewbeforehide', function () {
        Events.off(playbackManager, 'playerchange', onPlayerChange);
        releaseCurrentPlayer();
    });

    view.addEventListener('viewdestroy', function () {
        if (reactOsdCleanup) {
            reactOsdCleanup();
            reactOsdCleanup = null;
        }
    });
}
