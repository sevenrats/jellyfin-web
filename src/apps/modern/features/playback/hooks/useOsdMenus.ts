import { useCallback } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import globalize from 'lib/globalize';

import { showActionSheet, type ActionSheetItem } from '../components/ActionSheet';

interface Stream { Index: number; DisplayTitle?: string }

const player = () => playbackManager.getCurrentPlayer();

function tracksToItems(streams: Stream[], currentIndex: number): ActionSheetItem[] {
    return streams.map(s => ({
        id: s.Index,
        name: s.DisplayTitle,
        selected: s.Index === currentIndex
    }));
}

interface UseOsdMenusOptions {
    /** Toggle the stats overlay (B4d). */
    onToggleStats?: () => void;
    /** Enable + show subtitle sync (B4c). */
    onSubtitleOffset?: () => void;
}

/**
 * OSD audio / subtitle / settings menus, using the React ActionSheet.
 * Audio + subtitle track selection are fully ported (mirror index.js:1019-1181).
 * The settings menu offers the ready options (stats, subtitle offset); quality
 * and playback-rate (legacy playersettingsmenu) are a later milestone.
 */
export function useOsdMenus({ onToggleStats, onSubtitleOffset }: UseOsdMenusOptions = {}) {
    const openAudioMenu = useCallback(async (anchor: Element) => {
        const p = player();
        const currentIndex = playbackManager.getAudioStreamIndex(p);
        const items = tracksToItems(playbackManager.audioTracks(p), currentIndex);
        try {
            const id = await showActionSheet({ title: globalize.translate('Audio'), items, positionTo: anchor });
            const index = parseInt(id, 10);
            if (index !== currentIndex) playbackManager.setAudioStreamIndex(index, p);
        } catch { /* dismissed */ }
    }, []);

    const openSubtitleMenu = useCallback(async (anchor: Element) => {
        const p = player();
        let currentIndex = playbackManager.getSubtitleStreamIndex(p);
        if (currentIndex == null) currentIndex = -1;
        const streams: Stream[] = [{ Index: -1, DisplayTitle: globalize.translate('Off') }, ...playbackManager.subtitleTracks(p)];
        const items = tracksToItems(streams, currentIndex);
        try {
            const id = await showActionSheet({ title: globalize.translate('Subtitles'), items, positionTo: anchor });
            const index = parseInt(id, 10);
            if (index !== currentIndex) playbackManager.setSubtitleStreamIndex(index, p);
        } catch { /* dismissed */ }
    }, []);

    const openSettingsMenu = useCallback(async (anchor: Element) => {
        const p = player();
        const showSubOffset = playbackManager.supportSubtitleOffset(p)
            && playbackManager.canHandleOffsetOnCurrentSubtitle(p);
        const items: ActionSheetItem[] = [
            { id: 'stats', name: globalize.translate('PlaybackData') }
        ];
        if (showSubOffset) {
            items.push({ id: 'suboffset', name: globalize.translate('SubtitleOffset') });
        }
        try {
            const id = await showActionSheet({ items, positionTo: anchor });
            if (id === 'stats') {
                onToggleStats?.();
            } else if (id === 'suboffset') {
                playbackManager.enableShowingSubtitleOffset(p);
                onSubtitleOffset?.();
            }
        } catch { /* dismissed */ }
    }, [onToggleStats, onSubtitleOffset]);

    return { openAudioMenu, openSubtitleMenu, openSettingsMenu };
}
