import React, { type FC, type CSSProperties } from 'react';
import type { ChapterInfo } from '@jellyfin/sdk/lib/generated-client/models/chapter-info';
import type { TrickplayInfoDto } from '@jellyfin/sdk/lib/generated-client/models/trickplay-info-dto';

import { ServerConnections } from 'lib/jellyfin-apiclient';
import { BubbleText } from 'elements/jf-slider/Slider';
import datetime from 'scripts/datetime';

interface TrickplayItem {
    Id?: string;
    ServerId?: string;
    Chapters?: ChapterInfo[] | null;
}

export interface TrickplayBubbleProps {
    item: TrickplayItem;
    /** Resolved trickplay tier (from useTrickplayResolution); null → no trickplay. */
    trickplayInfo: TrickplayInfoDto | null;
    mediaSourceId: string | null;
    /** Hovered/scrubbed position in ticks. */
    positionTicks: number;
}

// The chapter whose start is at or before positionTicks (the "current" one).
function findChapter(chapters: ChapterInfo[] | null | undefined, positionTicks: number): { chapter?: ChapterInfo; index: number } {
    let chapter: ChapterInfo | undefined;
    let index = -1;
    for (let i = 0; i < (chapters?.length ?? 0); i++) {
        const current = chapters![i];
        if (positionTicks < (current.StartPositionTicks ?? 0)) break;
        chapter = current;
        index = i;
    }
    return { chapter, index };
}

// Sprite-sheet math: pick the tile for positionTicks and derive the sprite URL
// + background offset. Ported from the legacy OSD's updateTrickplayBubbleHtml.
function trickplayTileStyle(
    apiClient: NonNullable<ReturnType<typeof ServerConnections.getApiClient>>,
    trickplayInfo: TrickplayInfoDto,
    itemId: string,
    mediaSourceId: string,
    positionTicks: number
): CSSProperties {
    const width = trickplayInfo.Width ?? 0;
    const height = trickplayInfo.Height ?? 0;
    const tileWidth = trickplayInfo.TileWidth ?? 0;
    const tileHeight = trickplayInfo.TileHeight ?? 0;
    const interval = trickplayInfo.Interval || 1;

    const currentTimeMs = positionTicks / 10_000;
    const currentTile = Math.floor(currentTimeMs / interval);

    const tileSize = tileWidth * tileHeight;
    const tileOffset = tileSize > 0 ? currentTile % tileSize : 0;
    const index = tileSize > 0 ? Math.floor(currentTile / tileSize) : 0;

    const tileOffsetX = tileWidth > 0 ? tileOffset % tileWidth : 0;
    const tileOffsetY = tileWidth > 0 ? Math.floor(tileOffset / tileWidth) : 0;

    const imgSrc = apiClient.getUrl(
        'Videos/' + itemId + '/Trickplay/' + width + '/' + index + '.jpg',
        {
            ApiKey: apiClient.accessToken(),
            MediaSourceId: mediaSourceId
        }
    );

    return {
        width: width + 'px',
        height: height + 'px',
        backgroundImage: `url('${imgSrc}')`,
        backgroundPositionX: -(tileOffsetX * width) + 'px',
        backgroundPositionY: -(tileOffsetY * height) + 'px'
    };
}

/**
 * Seek-bar preview bubble content. Renders (in fall-through order):
 *   1. a trickplay sprite thumbnail + timestamp + chapter name, when a
 *      trickplay tier is available;
 *   2. a chapter image + timestamp + chapter name, when the current chapter has
 *      an image;
 *   3. a plain timestamp (<BubbleText>) when neither is available.
 *
 * Returns null only when there's no valid item to describe. All positioning
 * uses React style props (no imperative HTML).
 */
const TrickplayBubble: FC<TrickplayBubbleProps> = ({ item, trickplayInfo, mediaSourceId, positionTicks }) => {
    if (!item.Id || !item.ServerId) return null;

    const apiClient = ServerConnections.getApiClient(item.ServerId);
    if (!apiClient) return null;

    const { chapter, index } = findChapter(item.Chapters, positionTicks);
    const timeText = datetime.getDisplayRunningTime(positionTicks);
    const chapterName = chapter?.Name ?? '';

    if (trickplayInfo && mediaSourceId) {
        const style = trickplayTileStyle(apiClient, trickplayInfo, item.Id, mediaSourceId, positionTicks);
        return (
            <div className='chapterThumbContainer'>
                <div className='chapterThumbWrapper' style={{ overflow: 'hidden', ...style }} />
                <div className='chapterThumbTextContainer'>
                    <div className='chapterThumbText chapterThumbText-dim'>{chapterName}</div>
                    <h2 className='chapterThumbText'>{timeText}</h2>
                </div>
            </div>
        );
    }

    const imgSrc = chapter?.ImageTag ?
        apiClient.getScaledImageUrl(item.Id, {
            maxWidth: 400,
            tag: chapter.ImageTag,
            type: 'Chapter',
            index
        }) :
        null;

    // No trickplay and no chapter image → plain timestamp.
    if (!imgSrc) return <BubbleText>{timeText}</BubbleText>;

    return (
        <div className='chapterThumbContainer chapterBubblePosition'>
            <img className='chapterThumb' src={imgSrc} alt='' />
            <div className='chapterThumbTextContainer'>
                <div className='chapterThumbText chapterThumbText-dim'>{chapterName}</div>
                <h2 className='chapterThumbText'>{timeText}</h2>
            </div>
        </div>
    );
};

export default TrickplayBubble;
