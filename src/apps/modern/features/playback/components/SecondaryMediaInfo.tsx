import React, { useMemo } from 'react';

import datetime from 'scripts/datetime';

interface ProgramItem {
    Type?: string;
    StartDate?: string;
    EndDate?: string;
    ChannelNumber?: string;
    ChannelName?: string;
    TimerId?: string;
    SeriesTimerId?: string;
    Status?: string;
}

interface SecondaryMediaInfoOptions {
    /** Include the weekday/month/day prefix on the program time. Default true. */
    startDate?: boolean;
    /** Include the start–end program time at all. Default true. */
    programTime?: boolean;
}

/** Timer icon class for a program, or null when no timer indicator applies. */
function getTimerIconClass(item: ProgramItem): string | null {
    const hasTimer = item.Type === 'SeriesTimer'
        || item.TimerId || item.SeriesTimerId
        || item.Type === 'Timer';

    if (!hasTimer) {
        return null;
    }

    if (item.Type === 'SeriesTimer' || item.SeriesTimerId) {
        return 'fiber_smart_record';
    }

    return 'fiber_manual_record';
}

/** True when the smart-record icon should carry the active timer highlight. */
function isTimerActive(item: ProgramItem): boolean {
    if (item.Type === 'SeriesTimer') {
        return true;
    }

    if (item.SeriesTimerId) {
        const status = item.Status || 'Cancelled';
        return status !== 'Cancelled';
    }

    return true;
}

function getProgramTimeText(item: ProgramItem, options: SecondaryMediaInfoOptions): string | null {
    if (!item.StartDate || options.programTime === false) {
        return null;
    }

    try {
        let text = '';
        let date = datetime.parseISO8601Date(item.StartDate);

        if (options.startDate !== false) {
            text += datetime.toLocaleDateString(date, { weekday: 'short', month: 'short', day: 'numeric' });
        }

        text += ` ${datetime.getDisplayTime(date)}`;

        if (item.EndDate) {
            date = datetime.parseISO8601Date(item.EndDate);
            text += ` - ${datetime.getDisplayTime(date)}`;
        }

        return text;
    } catch (e) {
        console.error('error parsing date:', item.StartDate, e);
        return null;
    }
}

interface SecondaryMediaInfoProps {
    item: ProgramItem;
    options?: SecondaryMediaInfoOptions;
}

/**
 * React port of getSecondaryMediaInfoHtml/getProgramInfoHtml (mediainfo.js).
 * Renders live-TV program badges (program time, channel number/name, timer
 * indicator). Non-Program items render nothing — matching the legacy contract
 * which returned '' for movies/episodes. Non-interactive (no channel link):
 * VideoOsd never requested the interactive channel button.
 */
export default function SecondaryMediaInfo({ item, options }: Readonly<SecondaryMediaInfoProps>): React.ReactElement | null {
    const startDate = options?.startDate;
    const programTime = options?.programTime;

    const timeText = useMemo(
        () => (item.Type === 'Program' ? getProgramTimeText(item, { startDate, programTime }) : null),
        [item, startDate, programTime]
    );

    if (item.Type !== 'Program') {
        return null;
    }

    const timerIconClass = getTimerIconClass(item);
    const timerIconBase = 'material-icons mediaInfoItem mediaInfoIconItem';
    const timerClassName = timerIconClass && (isTimerActive(item) ?
        `${timerIconBase} mediaInfoTimerIcon ${timerIconClass}` :
        `${timerIconBase} ${timerIconClass}`);

    return (
        <>
            {timeText && <div className='mediaInfoItem'>{timeText}</div>}
            {item.ChannelNumber && <div className='mediaInfoItem'>{`CH ${item.ChannelNumber}`}</div>}
            {item.ChannelName && <div className='mediaInfoItem'>{item.ChannelName}</div>}
            {timerClassName && <span className={timerClassName} aria-hidden='true' />}
        </>
    );
}
