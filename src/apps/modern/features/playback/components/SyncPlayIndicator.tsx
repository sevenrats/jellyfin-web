import React, { useEffect, useRef, useState } from 'react';

import { pluginManager } from 'components/pluginManager';
import { PluginType } from 'constants/pluginType';
import Events from 'utils/events';

interface IconState {
    primary: string;
    secondary: string;
    animationClass: string;
    visibleMs: number; // -1 = sticky until cleared
}

// Action → icon mapping, ported from the legacy OSD showIcon (index.js:1981-2029).
function iconFor(action: string): IconState | null {
    switch (action) {
        case 'schedule-play': return { primary: 'sync spin', secondary: 'play_arrow centered', animationClass: 'infinitePulse', visibleMs: -1 };
        case 'unpause': return { primary: 'play_circle_outline', secondary: '', animationClass: 'oneShotPulse', visibleMs: 1500 };
        case 'pause': return { primary: 'pause_circle_outline', secondary: '', animationClass: 'oneShotPulse', visibleMs: 1500 };
        case 'seek': return { primary: 'update', secondary: '', animationClass: 'infinitePulse', visibleMs: -1 };
        case 'buffering': return { primary: 'schedule', secondary: '', animationClass: 'infinitePulse', visibleMs: -1 };
        case 'wait-pause': return { primary: 'schedule', secondary: 'pause shifted', animationClass: 'infinitePulse', visibleMs: -1 };
        case 'wait-unpause': return { primary: 'schedule', secondary: 'play_arrow shifted', animationClass: 'infinitePulse', visibleMs: -1 };
        default: return null;
    }
}

interface SyncPlayIndicatorProps {
    /** Called for actions that also affect OSD visibility (schedule-play hides, pause shows). */
    onOsdHint?: (action: 'show' | 'hide') => void;
}

// React port of the SyncPlay animated icon overlay (index.js:1980-2085).
export default function SyncPlayIndicator({ onOsdHint }: Readonly<SyncPlayIndicatorProps>) {
    const [icon, setIcon] = useState<IconState | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        const SyncPlay = pluginManager.firstOfType(PluginType.SyncPlay)?.instance;
        if (!SyncPlay) return;

        const clearTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = undefined;
        };

        const showIcon = (action: string) => {
            const next = iconFor(action);
            clearTimer();
            setIcon(next);
            if (action === 'schedule-play') onOsdHint?.('hide');
            else if (action === 'pause') onOsdHint?.('show');
            if (next && next.visibleMs >= 0) {
                timerRef.current = setTimeout(() => setIcon(null), next.visibleMs);
            }
        };

        const onEnabled = (_e: unknown, enabled: boolean) => {
            if (!enabled) setIcon(null);
        };
        const onNotify = (_e: unknown, action: string) => showIcon(action);
        const onGroupState = (_e: unknown, groupState: string, reason: string) => {
            if (groupState === 'Playing' && (reason === 'Unpause' || reason === 'Ready')) showIcon('schedule-play');
            else if (groupState === 'Paused' && reason === 'Pause') showIcon('pause');
            else if (groupState === 'Paused' && reason === 'Ready') showIcon('clear');
            else if (groupState === 'Waiting' && reason === 'Seek') showIcon('seek');
        };

        Events.on(SyncPlay.Manager, 'enabled', onEnabled);
        Events.on(SyncPlay.Manager, 'notify-osd', onNotify);
        Events.on(SyncPlay.Manager, 'group-state-update', onGroupState);

        return () => {
            clearTimer();
            Events.off(SyncPlay.Manager, 'enabled', onEnabled);
            Events.off(SyncPlay.Manager, 'notify-osd', onNotify);
            Events.off(SyncPlay.Manager, 'group-state-update', onGroupState);
        };
    }, [onOsdHint]);

    if (!icon) return null;

    return (
        <div className='syncPlayContainer'>
            <div id='syncPlayIcon' className={`syncPlayIconCircle ${icon.animationClass}`} style={{ visibility: 'visible' }}>
                <span className={`primary-icon material-icons ${icon.primary}`} aria-hidden='true' />
                <span className={`secondary-icon material-icons ${icon.secondary}`} aria-hidden='true' />
            </div>
        </div>
    );
}
