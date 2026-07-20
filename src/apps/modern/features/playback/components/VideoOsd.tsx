import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AirplayIcon from '@mui/icons-material/Airplay';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import PauseIcon from '@mui/icons-material/Pause';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import 'styles/videoosd.scss';

import { playbackManager } from 'components/playback/playbackmanager';
import FavoriteButton from 'elements/emby-ratingbutton/FavoriteButton';
import globalize from 'lib/globalize';
import datetime from 'scripts/datetime';

import { useInputCommands } from '../hooks/useInputCommands';
import { useOsdGestures } from '../hooks/useOsdGestures';
import { useOsdKeyboard } from '../hooks/useOsdKeyboard';
import { useOsdMenus } from '../hooks/useOsdMenus';
import { useOsdVisibility } from '../hooks/useOsdVisibility';
import { usePlaybackRateRestore } from '../hooks/usePlaybackRateRestore';
import { usePlayerOsdState } from '../hooks/usePlayerOsdState';
import { usePlayerVolume } from '../hooks/usePlayerVolume';
import { useTrickplayResolution } from '../hooks/useTrickplayResolution';
import { useUpNext } from '../hooks/useUpNext';
import { useVideoTitle } from '../hooks/useVideoTitle';
import OsdPositionSlider from './OsdPositionSlider';
import TrickplayBubble from './TrickplayBubble';
import OsdVolumeSlider from './OsdVolumeSlider';
import PlayerStatsOverlay from './PlayerStatsOverlay';
import RecordButton from './RecordButton';
import SecondaryMediaInfo from './SecondaryMediaInfo';
import SubtitleSyncOverlay, { type SubtitleSyncHandle } from './SubtitleSyncOverlay';
import SyncPlayIndicator from './SyncPlayIndicator';

const ticksToPercent = (position: number, runtime: number) => (runtime > 0 ? (position / runtime) * 100 : 0);

/**
 * React video OSD (B2 shell + B3 keyboard/gesture/input handling): title,
 * progress bar (jf-slider w/ chapter markers), transport, and volume — wired to
 * playbackManager via the B1 hooks. Menus/stats/subtitlesync/trickplay-bubble
 * and route cutover are later milestones (B4/B5).
 * Rendered as a self-contained overlay for A/B against the legacy OSD.
 */
export default function VideoOsd() {
    const rootRef = useRef<HTMLDivElement>(null);
    const { visible, show, hide, toggle } = useOsdVisibility(rootRef);

    const state = usePlayerOsdState();
    const volume = usePlayerVolume();

    const [statsVisible, setStatsVisible] = useState(false);
    const syncRef = useRef<SubtitleSyncHandle>(null);
    const upNextRef = useRef<HTMLDivElement>(null);

    useUpNext(upNextRef);
    useVideoTitle(state.item as Parameters<typeof useVideoTitle>[0]);
    usePlaybackRateRestore();

    const player = () => playbackManager.getCurrentPlayer();

    // Stable visibility getter for the keyboard/input hooks (avoids resubscribing
    // on every visibility change).
    const visibleRef = useRef(visible);
    useEffect(() => {
        visibleRef.current = visible;
    }, [visible]);
    const isVisible = useCallback(() => visibleRef.current, []);

    const onToggleStats = useCallback(() => setStatsVisible(v => !v), []);
    const onCloseStats = useCallback(() => setStatsVisible(false), []);
    const onSubtitleOffset = useCallback(() => syncRef.current?.toggle(), []);
    const incrementOffset = useCallback(() => syncRef.current?.incrementOffset(), []);
    const decrementOffset = useCallback(() => syncRef.current?.decrementOffset(), []);

    const { openAudioMenu, openSubtitleMenu, openSettingsMenu } = useOsdMenus({ onToggleStats, onSubtitleOffset });

    useOsdKeyboard({ show, hide, isVisible, incrementOffset, decrementOffset });
    useInputCommands({ show, hide, isVisible });

    const onOpenAudio = useCallback((e: React.MouseEvent) => openAudioMenu(e.currentTarget), [openAudioMenu]);
    const onOpenSubtitles = useCallback((e: React.MouseEvent) => openSubtitleMenu(e.currentTarget), [openSubtitleMenu]);
    const onOpenSettings = useCallback((e: React.MouseEvent) => openSettingsMenu(e.currentTarget), [openSettingsMenu]);

    const onSwipeSeek = useCallback((deltaFraction: number) => {
        const current = ticksToPercent(state.positionTicks, state.runtimeTicks);
        const next = Math.min(100, Math.max(0, current + deltaFraction * 100));
        playbackManager.seekPercent(next, player());
    }, [state.positionTicks, state.runtimeTicks]);

    useOsdGestures(rootRef, { onTap: toggle, onSwipeSeek });

    const positionPercent = ticksToPercent(state.positionTicks, state.runtimeTicks);

    const markers = useMemo(() => {
        const chapters = (state.item?.Chapters as Array<{ Name?: string; StartPositionTicks?: number }>) || [];
        if (!state.runtimeTicks) return [];
        return chapters.map(ch => ({
            name: ch.Name,
            progress: (ch.StartPositionTicks ?? 0) / state.runtimeTicks
        }));
    }, [state.item, state.runtimeTicks]);

    const bufferedRanges = useMemo(() => {
        if (!state.runtimeTicks) return [];
        return state.bufferedRanges
            .filter(r => r.end >= state.positionTicks)
            .map(r => ({ start: (r.start / state.runtimeTicks) * 100, end: (r.end / state.runtimeTicks) * 100 }));
    }, [state.bufferedRanges, state.runtimeTicks, state.positionTicks]);

    const trickplay = (state.item?.Trickplay as Parameters<typeof useTrickplayResolution>[0]) ?? null;
    const trickplayInfo = useTrickplayResolution(trickplay, state.mediaSourceId);

    // Seek-bar preview: TrickplayBubble renders a trickplay thumbnail → chapter
    // image → plain timestamp. All JSX, no imperative HTML.
    const trickplayItem = state.item as Parameters<typeof TrickplayBubble>[0]['item'] | null;
    const bubbleContent = useCallback(
        (percent: number) => {
            if (!trickplayItem) return null;
            return (
                <TrickplayBubble
                    item={trickplayItem}
                    trickplayInfo={trickplayInfo}
                    mediaSourceId={state.mediaSourceId}
                    positionTicks={(state.runtimeTicks * percent) / 100}
                />
            );
        },
        [trickplayItem, trickplayInfo, state.mediaSourceId, state.runtimeTicks]
    );

    const onSeek = useCallback((percent: number) => {
        playbackManager.seekPercent(percent, player());
    }, []);

    const onVolumeInput = useCallback((value: number) => {
        playbackManager.setVolume(value, player());
    }, []);

    const onPlayPause = useCallback(() => playbackManager.playPause(player()), []);
    const onPreviousTrack = useCallback(() => playbackManager.previousTrack(player()), []);
    const onNextTrack = useCallback(() => playbackManager.nextTrack(player()), []);
    const onRewind = useCallback(() => playbackManager.rewind(player()), []);
    const onFastForward = useCallback(() => playbackManager.fastForward(player()), []);
    const onToggleMute = useCallback(() => playbackManager.toggleMute(undefined, player()), []);
    const onToggleFullscreen = useCallback(() => playbackManager.toggleFullscreen(player()), []);
    const onTogglePip = useCallback(() => playbackManager.togglePictureInPicture(player()), []);
    const onToggleAirPlay = useCallback(() => playbackManager.toggleAirPlay(player()), []);
    const onSliderDrag = useCallback((dragging: boolean) => {
        if (dragging) show();
    }, [show]);
    const onSyncPlayOsdHint = useCallback((hint: 'show' | 'hide') => {
        if (hint === 'show') show();
        else hide();
    }, [show, hide]);

    if (!state.hasPlayer) return null;

    const item = state.item as { Type?: string; Name?: string; Id?: string; ServerId?: string; UserData?: { IsFavorite?: boolean } } | null;

    return (
        <>
            {/* SyncPlay + up-next overlays: rendered outside the OSD fade so they
                can appear while the controls are hidden. */}
            <SyncPlayIndicator onOsdHint={onSyncPlayOsdHint} />
            <div ref={upNextRef} className='upNextContainer' />

            <Fade in={visible}>
                <div
                    ref={rootRef}
                    className='videoOsdReact'
                    style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '1em', background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
                >
                    <Stack spacing={1}>
                        <Typography variant='h3' noWrap>{item?.Name ?? ''}</Typography>
                        {state.isFetching && (
                            <div className='osdMediaStatus'>
                                <span className='material-icons animate autorenew' aria-hidden='true' />
                                <span>{globalize.translate('FetchingData')}</span>
                            </div>
                        )}
                        {item?.Type === 'Program' && (
                            <div className='osdSecondaryMediaInfo'>
                                <SecondaryMediaInfo item={item} options={{ startDate: false, programTime: false }} />
                            </div>
                        )}

                        <Stack direction='row' spacing={1} alignItems='center'>
                            <Typography variant='body2' sx={{ minWidth: '4em', textAlign: 'right' }}>
                                {datetime.getDisplayRunningTime(state.positionTicks)}
                            </Typography>
                            <div style={{ flexGrow: 1 }}>
                                <OsdPositionSlider
                                    value={positionPercent}
                                    disabled={!state.canSeek}
                                    isClear={state.isProgressClear}
                                    markers={markers}
                                    bufferedRanges={bufferedRanges}
                                    bubbleContent={bubbleContent}
                                    onChange={onSeek}
                                    onActivate={onPlayPause}
                                    onDraggingChange={onSliderDrag}
                                />
                            </div>
                            <Typography variant='body2' sx={{ minWidth: '4em' }}>
                                {state.runtimeTicks ? datetime.getDisplayRunningTime(state.runtimeTicks) : '--:--'}
                            </Typography>
                        </Stack>

                        <Stack direction='row' spacing={0.5} alignItems='center' justifyContent='center'>
                            <RecordButton item={item} />
                            <IconButton title={globalize.translate('PreviousTrack')} onClick={onPreviousTrack}>
                                <SkipPreviousIcon />
                            </IconButton>
                            <IconButton title={globalize.translate('Rewind')} onClick={onRewind}>
                                <FastRewindIcon />
                            </IconButton>
                            <IconButton title={globalize.translate(state.isPaused ? 'Play' : 'Pause')} onClick={onPlayPause}>
                                {state.isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                            </IconButton>
                            <IconButton title={globalize.translate('FastForward')} onClick={onFastForward}>
                                <FastForwardIcon />
                            </IconButton>
                            <IconButton title={globalize.translate('NextTrack')} onClick={onNextTrack}>
                                <SkipNextIcon />
                            </IconButton>

                            {item?.Id && (
                                <FavoriteButton itemId={item.Id} isFavorite={item.UserData?.IsFavorite} />
                            )}
                            <IconButton title={globalize.translate('Subtitles')} onClick={onOpenSubtitles}>
                                <ClosedCaptionIcon />
                            </IconButton>
                            <IconButton title={globalize.translate('Audio')} onClick={onOpenAudio}>
                                <AudiotrackIcon />
                            </IconButton>

                            {volume.showMuteButton && (
                                <IconButton title={globalize.translate(volume.isMuted ? 'Unmute' : 'Mute')} onClick={onToggleMute}>
                                    {volume.isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                                </IconButton>
                            )}
                            {volume.showVolumeSlider && (
                                <div style={{ width: 120 }}>
                                    <OsdVolumeSlider
                                        value={volume.volume}
                                        onInput={onVolumeInput}
                                        onDraggingChange={onSliderDrag}
                                    />
                                </div>
                            )}
                            <IconButton title={globalize.translate('Settings')} onClick={onOpenSettings}>
                                <SettingsIcon />
                            </IconButton>
                            {state.supportedCommands.includes('AirPlay') && (
                                <IconButton title={globalize.translate('AirPlay')} onClick={onToggleAirPlay}>
                                    <AirplayIcon />
                                </IconButton>
                            )}
                            {state.supportedCommands.includes('PictureInPicture') && (
                                <IconButton title={globalize.translate('PictureInPicture')} onClick={onTogglePip}>
                                    <PictureInPictureAltIcon />
                                </IconButton>
                            )}
                            {state.supportedCommands.includes('ToggleFullscreen') && (
                                <IconButton title={globalize.translate('Fullscreen')} onClick={onToggleFullscreen}>
                                    <FullscreenIcon />
                                </IconButton>
                            )}
                        </Stack>
                    </Stack>

                    <SubtitleSyncOverlay ref={syncRef} />
                    {statsVisible && <PlayerStatsOverlay onClose={onCloseStats} />}
                </div>
            </Fade>
        </>
    );
}
