import React, { useCallback } from 'react';

import Slider from 'elements/jf-slider/Slider';

export interface OsdVolumeSliderProps {
    /** Volume level, 0-100. */
    value: number;
    disabled?: boolean;
    /** Live volume changes during drag → setVolume. */
    onInput: (value: number) => void;
    /** Reports drag start/stop so the host can suppress external value writes. */
    onDraggingChange?: (dragging: boolean) => void;
}

// Adapts jf-slider for the video OSD volume control. Live (onInput) — no
// markers, buffered band, or bubble.
const OsdVolumeSlider = ({ value, disabled, onInput, onDraggingChange }: OsdVolumeSliderProps) => {
    const handlePreview = useCallback(
        (preview: number | null) => onDraggingChange?.(preview !== null),
        [onDraggingChange]
    );

    return (
        <Slider
            className='osdVolumeSlider'
            value={value}
            min={0}
            max={100}
            step={1}
            disabled={disabled}
            // Not a TV focus stop — legacy OSD only made the position slider
            // D-pad-focusable; volume is adjusted via the volume keys.
            focusable={false}
            onInput={onInput}
            onPreview={handlePreview}
        />
    );
};

export default OsdVolumeSlider;
