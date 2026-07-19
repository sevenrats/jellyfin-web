import React from 'react';

import globalize from 'lib/globalize';
import Slider from 'elements/jf-slider/Slider';

interface SubtitleVerticalPositionSliderProps {
    /** Current vertical position, -16..16. */
    value: number;
    /** Live drag/keyboard tick — host refreshes the preview. */
    onInput: (value: number) => void;
    /** Hover/drag preview: non-null shows the persistent preview, null hides it. */
    onPreview: (value: number | null) => void;
    /** Committed value — host writes it into the form's saved state. */
    onChange: (value: number) => void;
}

// Adapts jf-slider for the subtitle vertical-position setting. Controlled by
// `value`; forwards live/preview/commit callbacks so the host form can drive
// its subtitle preview. Unlike ChapterSeekSlider this owns its own focus stop
// (the settings form has no parent driving it via a ref handle), so it stays
// focusable. keyboardMode='live' because subtitle position updates as you nudge.
const SubtitleVerticalPositionSlider = ({
    value,
    onInput,
    onPreview,
    onChange
}: SubtitleVerticalPositionSliderProps) => {
    return (
        <Slider
            value={value}
            min={-16}
            max={16}
            step={1}
            keyboardMode='live'
            ariaLabel={globalize.translate('LabelSubtitleVerticalPosition')}
            onInput={onInput}
            onPreview={onPreview}
            onChange={onChange}
        />
    );
};

export default SubtitleVerticalPositionSlider;
