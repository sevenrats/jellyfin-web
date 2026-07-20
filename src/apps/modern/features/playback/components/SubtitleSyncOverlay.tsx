import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import Slider, { BubbleText } from 'elements/jf-slider/Slider';

const MIN = -30;
const MAX = 30;
const STEP = 0.1;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));
const round = (v: number) => Math.round(v * 10) / 10;

export interface SubtitleSyncHandle {
    /** Show if eligible; 'hide' hides unless editing; 'forceToHide' always hides. */
    toggle: (action?: 'hide' | 'forceToHide') => void;
    incrementOffset: () => void;
    decrementOffset: () => void;
}

const player = () => playbackManager.getCurrentPlayer();

// React port of components/subtitlesync. Controls the subtitle offset (seconds)
// with a jf-slider + an editable field, gated on the player supporting offset and
// an external subtitle being active. Parent (VideoOsd) drives it via the ref
// (G/H keys → increment/decrement, toggle on show/hide/track-change).
const SubtitleSyncOverlay = forwardRef<SubtitleSyncHandle>((_props, ref) => {
    const [visible, setVisible] = useState(false);
    const [offset, setOffset] = useState(0);
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('0s');
    const editingRef = useRef(false);
    editingRef.current = editing;

    const applyOffset = useCallback((value: number) => {
        const v = round(clamp(value));
        setOffset(v);
        setText(v + 's');
        playbackManager.setSubtitleOffset(v, player());
    }, []);

    const toggle = useCallback((action?: 'hide' | 'forceToHide') => {
        const p = player();
        if (!p || !playbackManager.supportSubtitleOffset(p)) return;

        if (!action) {
            if (playbackManager.isShowingSubtitleOffsetEnabled(p) && playbackManager.canHandleOffsetOnCurrentSubtitle(p)) {
                if (!(playbackManager.getPlayerSubtitleOffset(p) || editingRef.current)) {
                    setOffset(0);
                    setText('0s');
                    playbackManager.setSubtitleOffset(0, p);
                }
                setVisible(true);
            }
            return;
        }
        // 'hide' must not hide while the field is being edited; 'forceToHide' always hides.
        if (action === 'hide' && editingRef.current) return;
        setVisible(false);
    }, []);

    useImperativeHandle(ref, () => ({
        toggle,
        incrementOffset: () => applyOffset(offset + STEP),
        decrementOffset: () => applyOffset(offset - STEP)
    }), [toggle, applyOffset, offset]);

    // Reset offset on unmount (mirrors legacy destroy()).
    useEffect(() => {
        return () => {
            const p = player();
            if (p) {
                playbackManager.disableShowingSubtitleOffset(p);
                playbackManager.setSubtitleOffset(0, p);
            }
        };
    }, []);

    const onSliderChange = useCallback((v: number) => applyOffset(v), [applyOffset]);

    const bubbleContent = useCallback(
        (v: number) => <BubbleText>{(v > 0 ? '+' : '') + round(v) + 's'}</BubbleText>,
        []
    );

    const onClose = useCallback(() => {
        const p = player();
        if (p) playbackManager.disableShowingSubtitleOffset(p);
        setVisible(false);
    }, []);

    const onFieldFocus = useCallback(() => setEditing(true), []);
    const onFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value), []);
    const onFieldKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            const m = /[-+]?\d+\.?\d*/.exec(text);
            if (m) applyOffset(parseFloat(m[0]));
            else setText((playbackManager.getPlayerSubtitleOffset(player()) || 0) + 's');
            setEditing(false);
            e.preventDefault();
        }
    }, [text, applyOffset]);
    const onFieldBlur = useCallback(() => setEditing(false), []);

    if (!visible) return null;

    return (
        <div className='subtitleSync' style={{ position: 'absolute', top: '10%', width: '100%' }}>
            <div className='subtitleSyncContainer' style={{ margin: '0 auto', width: '40%', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                <IconButton className='subtitleSync-closeButton' onClick={onClose} size='small'>
                    <CloseIcon />
                </IconButton>
                <input
                    className='subtitleSyncTextField'
                    value={text}
                    onFocus={onFieldFocus}
                    onChange={onFieldChange}
                    onKeyDown={onFieldKeyDown}
                    onBlur={onFieldBlur}
                    spellCheck={false}
                    style={{ width: '4em', textAlign: 'center' }}
                />
                <div className='subtitleSyncSliderContainer' style={{ flexGrow: 1 }}>
                    <Slider
                        value={offset}
                        min={MIN}
                        max={MAX}
                        step={STEP}
                        keepProgress
                        bubbleContent={bubbleContent}
                        onChange={onSliderChange}
                    />
                </div>
            </div>
        </div>
    );
});

SubtitleSyncOverlay.displayName = 'SubtitleSyncOverlay';

export default SubtitleSyncOverlay;
