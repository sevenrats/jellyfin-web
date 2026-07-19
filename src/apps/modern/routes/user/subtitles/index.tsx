import Button from '@mui/material/Button';
import { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import React, { useCallback } from 'react';

import { SubtitlePreferences } from 'apps/modern/features/preferences/components/SubtitlePreferences';
import { useSubtitleSettingForm } from 'apps/modern/features/preferences/hooks/useSubtitleSettingForm';
import type { SubtitleSettingsValues } from 'apps/modern/features/preferences/types/subtitleSettingsValues';
import LoadingComponent from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import globalize from 'lib/globalize';

export default function UserSubtitlePreferences() {
    const {
        context,
        loading,
        submitChanges,
        updateField,
        values
    } = useSubtitleSettingForm();

    const handleSubmitForm = useCallback((e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        void submitChanges();
    }, [submitChanges]);

    const handleFieldChange = useCallback((e: SelectChangeEvent | React.SyntheticEvent) => {
        const target = e.target as HTMLInputElement;
        const fieldName = target.name as keyof SubtitleSettingsValues;
        const fieldValue = target.type === 'checkbox' ? target.checked : target.value;

        if (values?.[fieldName] !== fieldValue) {
            updateField({ name: fieldName, value: fieldValue });
        }
    }, [updateField, values]);

    const handleDirectFieldChange = useCallback(
        (name: keyof SubtitleSettingsValues, value: string | number | boolean) => {
            updateField({ name, value });
        },
        [updateField]
    );

    if (loading || !values || !context) {
        return <LoadingComponent />;
    }

    return (
        <Page
            className='libraryPage userPreferencesPage noSecondaryNavPage'
            id='subtitlePreferencesPage'
            title={globalize.translate('Subtitles')}
        >
            <div className='settingsContainer padded-left padded-right padded-bottom-page'>
                <form
                    onSubmit={handleSubmitForm}
                    style={{ margin: 'auto' }}
                >
                    <Stack spacing={4}>
                        <SubtitlePreferences
                            onChange={handleFieldChange}
                            onFieldChange={handleDirectFieldChange}
                            values={values}
                            cultures={context.cultures}
                            showBurnIn={context.showBurnIn}
                            showAppearance={context.showAppearance}
                        />

                        <Button
                            type='submit'
                            size='large'
                        >
                            {globalize.translate('Save')}
                        </Button>
                    </Stack>
                </form>
            </div>
        </Page>
    );
}
