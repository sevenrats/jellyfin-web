import { useEffect } from 'react';

import datetime from 'scripts/datetime';
import itemHelper from 'components/itemHelper';
import LibraryMenu from 'scripts/libraryMenu';
import { EventType } from 'constants/eventType';
import Events from 'utils/events';

interface TitleItem {
    Type?: string;
    Name?: string;
    SeriesName?: string;
    Album?: string;
    EpisodeTitle?: string;
    IsSeries?: boolean;
    ProductionYear?: number;
    PremiereDate?: string;
}

/** Compute the parent-name prefix as the legacy updateDisplayItem did (index.js:92-96). */
function getParentName(item: TitleItem): string | undefined {
    if (item.EpisodeTitle || item.IsSeries) {
        return item.Name;
    }
    return item.SeriesName || item.Album;
}

/** Build the display title (ported from index.js setTitle, 237-268). */
function buildTitle(item: TitleItem): string {
    const parentName = getParentName(item);

    let itemName = itemHelper.getDisplayName(item, {
        includeParentInfo: item.Type !== 'Program',
        includeIndexNumber: item.Type !== 'Program'
    });

    if (itemName && parentName) {
        itemName = `${parentName} - ${itemName}`;
    }

    if (!itemName) {
        itemName = parentName || '';
    }

    let title = itemName;
    if (item.Type === 'Movie' && item.ProductionYear) {
        title += ` (${datetime.toLocaleString(item.ProductionYear, { useGrouping: false })})`;
    } else if (item.PremiereDate) {
        try {
            const year = datetime.toLocaleString(datetime.parseISO8601Date(item.PremiereDate).getFullYear(), { useGrouping: false });
            title += ` (${year})`;
        } catch (e) {
            console.error(e);
        }
    }

    return title;
}

/**
 * Owns the video page title: sets LibraryMenu/document.title and fires
 * VIDEO_TITLE_CHANGE (consumed by the video route toolbar, VideoPage). React
 * reimplementation of the legacy controller's setTitle path (index.js:237-268),
 * so the controller no longer needs to drive the title.
 */
export function useVideoTitle(item: TitleItem | null) {
    useEffect(() => {
        if (!item) {
            LibraryMenu.setTitle('');
            Events.trigger(document, EventType.VIDEO_TITLE_CHANGE, ['']);
            return;
        }

        const title = buildTitle(item);
        LibraryMenu.setTitle(title);
        Events.trigger(document, EventType.VIDEO_TITLE_CHANGE, [title]);
        document.title = title;
    }, [item]);
}
