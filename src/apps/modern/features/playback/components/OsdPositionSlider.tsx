import React, { forwardRef, useCallback } from 'react';

import Slider, { type JfSliderHandle, type SliderMarker, type SliderRange } from 'elements/jf-slider/Slider';

export interface OsdPositionSliderProps {
    /** Position as a percent, 0-100. */
    value: number;
    disabled?: boolean;
    /** Rail-only fill for live streams with unknown runtime (emby setIsClear). */
    isClear?: boolean;
    /** Chapter markers ({ progress: 0-1, name }). */
    markers?: SliderMarker[];
    /** Buffered spans already converted to percent (0-100). */
    bufferedRanges?: SliderRange[];
    /** Per-direction keyboard steps, as percent (from skip-back/forward settings). */
    keyboardStepBack?: number;
    keyboardStepForward?: number;
    /** Bubble: build custom (trickplay) HTML into the bubble; return true if handled. */
    updateBubbleHtml?: (bubble: HTMLElement, value: number) => boolean;
    /** Bubble: text/HTML fallback (chapter image or timestamp). */
    getBubbleText?: (value: number) => string | null;
    /** Committed value (drag release / click / keyboard commit) → seek. */
    onChange: (value: number) => void;
    /** OK/Enter with nothing staged → play/pause. */
    onActivate?: () => void;
    /** Reports drag start/stop so the host can suppress external value writes. */
    onDraggingChange?: (dragging: boolean) => void;
}

// Adapts jf-slider for the video OSD position/seek bar. All domain logic
// (seek math, trickplay, chapters, buffered conversion) stays in the OSD
// controller; this is a thin controlled wrapper it drives via props. Forwards
// a JfSliderHandle so the controller's TV keydown relay can nudge it.
const OsdPositionSlider = forwardRef<JfSliderHandle, OsdPositionSliderProps>(({
    value,
    disabled,
    isClear,
    markers,
    bufferedRanges,
    keyboardStepBack,
    keyboardStepForward,
    updateBubbleHtml,
    getBubbleText,
    onChange,
    onActivate,
    onDraggingChange
}, ref) => {
    const handlePreview = useCallback(
        (preview: number | null) => onDraggingChange?.(preview !== null),
        [onDraggingChange]
    );

    return (
        <Slider
            ref={ref}
            className='osdPositionSlider'
            value={value}
            min={0}
            max={100}
            step={0.01}
            disabled={disabled}
            isClear={isClear}
            keepProgress
            markers={markers}
            bufferedRanges={bufferedRanges}
            keyboardStepBack={keyboardStepBack}
            keyboardStepForward={keyboardStepForward}
            updateBubbleHtml={updateBubbleHtml}
            getBubbleText={getBubbleText}
            onChange={onChange}
            onActivate={onActivate}
            onPreview={handlePreview}
        />
    );
});

OsdPositionSlider.displayName = 'OsdPositionSlider';

export default OsdPositionSlider;
