import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import { getStats } from 'components/playerstats/playerstats';
import Events from 'utils/events';

import 'components/playerstats/playerstats.scss';

interface Stat { label: string; value: string }
interface Category { name?: string; subText?: string; stats: Stat[] }

interface PlayerStatsOverlayProps {
    onClose: () => void;
}

const player = () => playbackManager.getCurrentPlayer();

// React port of components/playerstats — reuses the exported getStats() compute
// chain and only re-implements the overlay view. Refreshes on the player's
// timeupdate event (mirrors the legacy bindEvents).
export default function PlayerStatsOverlay({ onClose }: Readonly<PlayerStatsOverlayProps>) {
    const [categories, setCategories] = useState<Category[]>([]);
    const cacheRef = useRef({}); // session cache holder for getStats

    useEffect(() => {
        let active = true;
        const refresh = () => {
            const p = player();
            if (!p) return;
            getStats(cacheRef.current, p).then((cats: Category[]) => {
                if (active) setCategories(cats);
            }).catch(() => { /* ignore */ });
        };

        let boundPlayer: unknown = null;
        const bind = () => {
            if (boundPlayer) Events.off(boundPlayer, 'timeupdate', refresh);
            boundPlayer = player();
            if (boundPlayer) Events.on(boundPlayer, 'timeupdate', refresh);
        };
        const onPlayerChange = () => {
            bind();
            refresh();
        };

        Events.on(playbackManager, 'playerchange', onPlayerChange);
        bind();
        refresh();

        return () => {
            active = false;
            Events.off(playbackManager, 'playerchange', onPlayerChange);
            if (boundPlayer) Events.off(boundPlayer, 'timeupdate', refresh);
        };
    }, []);

    const handleClose = useCallback(() => onClose(), [onClose]);

    return (
        <div className='playerStats'>
            <IconButton className='playerStats-closeButton' onClick={handleClose} size='small'>
                <CloseIcon />
            </IconButton>
            <div className='playerStats-content'>
                <div className='playerStats-stats'>
                    {categories.map((category, ci) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <React.Fragment key={ci}>
                            {category.stats.length > 0 && category.name && (
                                <div className='playerStats-stat playerStats-stat-header'>
                                    <div className='playerStats-stat-label'>{category.name}</div>
                                    <div className='playerStats-stat-value'>{category.subText || ''}</div>
                                </div>
                            )}
                            {category.stats.map((stat, si) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <div className='playerStats-stat' key={si}>
                                    <div className='playerStats-stat-label'>{stat.label}</div>
                                    <div className='playerStats-stat-value'>{stat.value}</div>
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}
