import type { CultureDto } from '@jellyfin/sdk/lib/generated-client';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useCallback, useEffect, useRef } from 'react';

import layoutManager from 'components/layoutManager';
import globalize from 'lib/globalize';
import subtitleAppearanceHelper from 'components/subtitlesettings/subtitleappearancehelper';
import SubtitleVerticalPositionSlider from 'components/subtitlesettings/SubtitleVerticalPositionSlider';

import type { SubtitleSettingsValues } from '../types/subtitleSettingsValues';

interface SubtitlePreferencesProps {
    onChange: (event: SelectChangeEvent | React.SyntheticEvent) => void;
    /** Update a single field directly (used by the non-DOM slider). */
    onFieldChange: (name: keyof SubtitleSettingsValues, value: string | number | boolean) => void;
    values: SubtitleSettingsValues;
    cultures: CultureDto[];
    showBurnIn: boolean;
    showAppearance: boolean;
}

const SUBTITLE_MODE_HELP: Record<string, string> = {
    Default: 'DefaultSubtitlesHelp',
    Smart: 'SmartSubtitlesHelp',
    Always: 'AlwaysPlaySubtitlesHelp',
    OnlyForced: 'OnlyForcedSubtitlesHelp',
    None: 'NoSubtitlesHelp'
};

const SUBTITLE_STYLING_HELP: Record<string, string> = {
    Auto: 'AutoSubtitleStylingHelp',
    Custom: 'CustomSubtitleStylingHelp',
    Native: 'NativeSubtitleStylingHelp'
};

export function SubtitlePreferences({
    onChange,
    onFieldChange,
    values,
    cultures,
    showBurnIn,
    showAppearance
}: Readonly<SubtitlePreferencesProps>) {
    const isTv = layoutManager.tv;
    const previewTextRef = useRef<HTMLDivElement>(null);
    const previewWindowRef = useRef<HTMLDivElement>(null);

    // Both live drag ticks and the committed value feed the same state field;
    // the preview re-renders from that state (see the effect below).
    const handleVerticalPosition = useCallback(
        (value: number) => onFieldChange('verticalPosition', value),
        [onFieldChange]
    );
    const noopPreview = useCallback(() => { /* preview is driven by state */ }, []);

    // Live preview: reapply the appearance styles whenever a relevant field
    // changes. Reuses the legacy helper so the styling logic stays single-source.
    useEffect(() => {
        subtitleAppearanceHelper.applyStyles({
            window: previewWindowRef.current,
            text: previewTextRef.current,
            preview: true
        }, values);
    }, [values]);

    return (
        <Stack spacing={3}>
            <Typography variant='h2'>{globalize.translate('Subtitles')}</Typography>

            <FormControl fullWidth>
                <InputLabel id='subtitle-language-label'>{globalize.translate('LabelPreferredSubtitleLanguage')}</InputLabel>
                <Select
                    inputProps={{ name: 'subtitleLanguage' }}
                    labelId='subtitle-language-label'
                    onChange={onChange}
                    value={values.subtitleLanguage}
                >
                    <MenuItem value=''>{globalize.translate('AnyLanguage')}</MenuItem>
                    {cultures.map(culture => (
                        <MenuItem key={culture.ThreeLetterISOLanguageName} value={culture.ThreeLetterISOLanguageName ?? ''}>
                            {culture.DisplayName}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth>
                <InputLabel id='subtitle-mode-label'>{globalize.translate('LabelSubtitlePlaybackMode')}</InputLabel>
                <Select
                    inputProps={{ name: 'subtitleMode' }}
                    labelId='subtitle-mode-label'
                    onChange={onChange}
                    value={values.subtitleMode}
                >
                    <MenuItem value='Default'>{globalize.translate('Default')}</MenuItem>
                    <MenuItem value='Smart'>{globalize.translate('Smart')}</MenuItem>
                    <MenuItem value='OnlyForced'>{globalize.translate('OnlyForcedSubtitles')}</MenuItem>
                    <MenuItem value='Always'>{globalize.translate('AlwaysPlaySubtitles')}</MenuItem>
                    <MenuItem value='None'>{globalize.translate('None')}</MenuItem>
                </Select>
                {SUBTITLE_MODE_HELP[values.subtitleMode] && (
                    <FormHelperText>{globalize.translate(SUBTITLE_MODE_HELP[values.subtitleMode])}</FormHelperText>
                )}
            </FormControl>

            {showBurnIn && (
                <FormControl fullWidth>
                    <InputLabel id='subtitle-burnin-label'>{globalize.translate('LabelBurnSubtitles')}</InputLabel>
                    <Select
                        inputProps={{ name: 'subtitleBurnIn' }}
                        labelId='subtitle-burnin-label'
                        onChange={onChange}
                        value={values.subtitleBurnIn}
                    >
                        <MenuItem value=''>{globalize.translate('Auto')}</MenuItem>
                        <MenuItem value='onlyimageformats'>{globalize.translate('OnlyImageFormats')}</MenuItem>
                        <MenuItem value='allcomplexformats'>{globalize.translate('AllComplexFormats')}</MenuItem>
                        <MenuItem value='all'>{globalize.translate('All')}</MenuItem>
                    </Select>
                    <FormHelperText>{globalize.translate('BurnSubtitlesHelp')}</FormHelperText>
                </FormControl>
            )}

            {/* PGS option is only available when burn-in is 'auto' (empty). */}
            {showBurnIn && values.subtitleBurnIn === '' && (
                <FormControl fullWidth>
                    <FormControlLabel
                        control={<Checkbox checked={values.subtitleRenderPgs} onChange={onChange} />}
                        label={globalize.translate('RenderPgsSubtitle')}
                        name='subtitleRenderPgs'
                    />
                    <FormHelperText>{globalize.translate('RenderPgsSubtitleHelp')}</FormHelperText>
                </FormControl>
            )}

            <FormControl fullWidth>
                <FormControlLabel
                    control={<Checkbox checked={values.alwaysBurnInSubtitleWhenTranscoding} onChange={onChange} />}
                    label={globalize.translate('AlwaysBurnInSubtitleWhenTranscoding')}
                    name='alwaysBurnInSubtitleWhenTranscoding'
                />
                <FormHelperText>{globalize.translate('AlwaysBurnInSubtitleWhenTranscodingHelp')}</FormHelperText>
            </FormControl>

            {showAppearance && (
                <Stack spacing={3}>
                    <Typography variant='h2'>{globalize.translate('HeaderSubtitleAppearance')}</Typography>

                    <div
                        className='subtitleappearance-preview flex align-items-center justify-content-center'
                        style={{ margin: '2em 0', padding: '1.6em', color: 'black', background: 'linear-gradient(140deg,#aa5cc3,#00a4dc)' }}
                    >
                        <div
                            ref={previewWindowRef}
                            className='subtitleappearance-preview-window flex align-items-center justify-content-center'
                            style={{ width: '90%', padding: '.25em' }}
                        >
                            <div
                                ref={previewTextRef}
                                className='subtitleappearance-preview-text flex align-items-center justify-content-center'
                            >
                                {globalize.translate('TheseSettingsAffectSubtitlesOnThisDevice')}
                            </div>
                        </div>
                    </div>
                    <FormHelperText>{globalize.translate('SubtitleAppearanceSettingsDisclaimer')}</FormHelperText>
                    <FormHelperText>{globalize.translate('SubtitleAppearanceSettingsAlsoPassedToCastDevices')}</FormHelperText>

                    <FormControl fullWidth>
                        <InputLabel id='subtitle-styling-label'>{globalize.translate('LabelSubtitleStyling')}</InputLabel>
                        <Select
                            inputProps={{ name: 'subtitleStyling' }}
                            labelId='subtitle-styling-label'
                            onChange={onChange}
                            value={values.subtitleStyling}
                        >
                            <MenuItem value='Auto'>{globalize.translate('Auto')}</MenuItem>
                            <MenuItem value='Custom'>{globalize.translate('Custom')}</MenuItem>
                            <MenuItem value='Native'>{globalize.translate('Native')}</MenuItem>
                        </Select>
                        {SUBTITLE_STYLING_HELP[values.subtitleStyling] && (
                            <FormHelperText>{globalize.translate(SUBTITLE_STYLING_HELP[values.subtitleStyling])}</FormHelperText>
                        )}
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id='subtitle-textsize-label'>{globalize.translate('LabelTextSize')}</InputLabel>
                        <Select
                            inputProps={{ name: 'textSize' }}
                            labelId='subtitle-textsize-label'
                            onChange={onChange}
                            value={values.textSize}
                        >
                            <MenuItem value='smaller'>{globalize.translate('Smaller')}</MenuItem>
                            <MenuItem value='small'>{globalize.translate('Small')}</MenuItem>
                            <MenuItem value=''>{globalize.translate('Normal')}</MenuItem>
                            <MenuItem value='large'>{globalize.translate('Large')}</MenuItem>
                            <MenuItem value='larger'>{globalize.translate('Larger')}</MenuItem>
                            <MenuItem value='extralarge'>{globalize.translate('ExtraLarge')}</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id='subtitle-textweight-label'>{globalize.translate('LabelTextWeight')}</InputLabel>
                        <Select
                            inputProps={{ name: 'textWeight' }}
                            labelId='subtitle-textweight-label'
                            onChange={onChange}
                            value={values.textWeight}
                        >
                            <MenuItem value='normal'>{globalize.translate('Normal')}</MenuItem>
                            <MenuItem value='bold'>{globalize.translate('Bold')}</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id='subtitle-font-label'>{globalize.translate('LabelFont')}</InputLabel>
                        <Select
                            inputProps={{ name: 'font' }}
                            labelId='subtitle-font-label'
                            onChange={onChange}
                            value={values.font}
                        >
                            <MenuItem value=''>{globalize.translate('Default')}</MenuItem>
                            <MenuItem value='typewriter'>{globalize.translate('Typewriter')}</MenuItem>
                            <MenuItem value='print'>{globalize.translate('Print')}</MenuItem>
                            <MenuItem value='console'>{globalize.translate('Console')}</MenuItem>
                            <MenuItem value='cursive'>{globalize.translate('Cursive')}</MenuItem>
                            <MenuItem value='casual'>{globalize.translate('Casual')}</MenuItem>
                            <MenuItem value='smallcaps'>{globalize.translate('SmallCaps')}</MenuItem>
                        </Select>
                    </FormControl>

                    {/* On TV, a color dropdown replaces the native color picker. */}
                    {isTv ? (
                        <FormControl fullWidth>
                            <InputLabel id='subtitle-textcolor-label'>{globalize.translate('LabelTextColor')}</InputLabel>
                            <Select
                                inputProps={{ name: 'textColor' }}
                                labelId='subtitle-textcolor-label'
                                onChange={onChange}
                                value={values.textColor}
                            >
                                <MenuItem value='#ffffff'>{globalize.translate('SubtitleWhite')}</MenuItem>
                                <MenuItem value='#d3d3d3'>{globalize.translate('SubtitleLightGray')}</MenuItem>
                                <MenuItem value='#808080'>{globalize.translate('SubtitleGray')}</MenuItem>
                                <MenuItem value='#ffff00'>{globalize.translate('SubtitleYellow')}</MenuItem>
                                <MenuItem value='#008000'>{globalize.translate('SubtitleGreen')}</MenuItem>
                                <MenuItem value='#00ffff'>{globalize.translate('SubtitleCyan')}</MenuItem>
                                <MenuItem value='#0000ff'>{globalize.translate('SubtitleBlue')}</MenuItem>
                                <MenuItem value='#ff00ff'>{globalize.translate('SubtitleMagenta')}</MenuItem>
                                <MenuItem value='#ff0000'>{globalize.translate('SubtitleRed')}</MenuItem>
                                <MenuItem value='#000000'>{globalize.translate('SubtitleBlack')}</MenuItem>
                            </Select>
                        </FormControl>
                    ) : (
                        <TextField
                            type='color'
                            name='textColor'
                            label={globalize.translate('LabelTextColor')}
                            value={values.textColor}
                            onChange={onChange}
                        />
                    )}

                    <FormControl fullWidth>
                        <InputLabel id='subtitle-dropshadow-label'>{globalize.translate('LabelDropShadow')}</InputLabel>
                        <Select
                            inputProps={{ name: 'dropShadow' }}
                            labelId='subtitle-dropshadow-label'
                            onChange={onChange}
                            value={values.dropShadow}
                        >
                            <MenuItem value='none'>{globalize.translate('None')}</MenuItem>
                            <MenuItem value='raised'>{globalize.translate('Raised')}</MenuItem>
                            <MenuItem value='depressed'>{globalize.translate('Depressed')}</MenuItem>
                            <MenuItem value='uniform'>{globalize.translate('Uniform')}</MenuItem>
                            <MenuItem value=''>{globalize.translate('DropShadow')}</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <SubtitleVerticalPositionSlider
                            value={values.verticalPosition}
                            onInput={handleVerticalPosition}
                            onPreview={noopPreview}
                            onChange={handleVerticalPosition}
                        />
                        <FormHelperText>{globalize.translate('SubtitleVerticalPositionHelp')}</FormHelperText>
                    </FormControl>
                </Stack>
            )}
        </Stack>
    );
}
