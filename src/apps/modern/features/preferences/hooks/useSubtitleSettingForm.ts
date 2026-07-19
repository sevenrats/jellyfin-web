import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import toast from 'components/toast/toast';
import globalize from 'lib/globalize';

import type { SubtitleSettingsValues } from '../types/subtitleSettingsValues';
import { useSubtitleSettings } from './useSubtitleSettings';

type UpdateField = {
    name: keyof SubtitleSettingsValues;
    value: string | boolean | number;
};

export function useSubtitleSettingForm() {
    const [urlParams] = useSearchParams();
    const {
        context,
        loading,
        saveSubtitleSettings
    } = useSubtitleSettings({ userId: urlParams.get('userId') });
    const [formValues, setFormValues] = useState<SubtitleSettingsValues>();

    useEffect(() => {
        if (!loading && context && !formValues) {
            setFormValues(context.values);
        }
    }, [formValues, loading, context]);

    const updateField = useCallback(({ name, value }: UpdateField) => {
        setFormValues(prev => (prev ? { ...prev, [name]: value } : prev));
    }, []);

    const submitChanges = useCallback(async () => {
        if (formValues) {
            await saveSubtitleSettings(formValues);
            toast(globalize.translate('SettingsSaved'));
        }
    }, [formValues, saveSubtitleSettings]);

    return {
        loading,
        context,
        values: formValues,
        submitChanges,
        updateField
    };
}
