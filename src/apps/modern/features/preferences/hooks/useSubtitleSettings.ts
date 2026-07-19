import type { CultureDto, SubtitlePlaybackMode, UserDto } from '@jellyfin/sdk/lib/generated-client';
import { ApiClient } from 'jellyfin-apiclient';
import { useCallback, useEffect, useState } from 'react';

import { appHost } from 'components/apphost';
import { AppFeature } from 'constants/appFeature';
import { useApi } from 'hooks/useApi';
import appSettings from 'scripts/settings/appSettings';
import { currentSettings, UserSettings } from 'scripts/settings/userSettings';

import type { SubtitleSettingsValues } from '../types/subtitleSettingsValues';

interface UseSubtitleSettingsParams {
    userId?: string | null;
}

// The appearance-settings storage key the legacy component used by default.
const APPEARANCE_KEY = 'localplayersubtitleappearance3';

// The legacy userSettings getter is typed as `Object`; this is the shape it holds.
interface StoredAppearanceSettings {
    subtitleStyling?: string;
    textSize?: string;
    textWeight?: string;
    dropShadow?: string;
    font?: string;
    textBackground?: string;
    textColor?: string;
    verticalPosition?: string | number;
}

export interface SubtitleSettingsContext {
    values: SubtitleSettingsValues;
    cultures: CultureDto[];
    /** Whether the burn-in section (device transcoding) should be shown. */
    showBurnIn: boolean;
    /** Whether the appearance section is supported on this device. */
    showAppearance: boolean;
}

export function useSubtitleSettings({ userId }: UseSubtitleSettingsParams) {
    const [loading, setLoading] = useState(true);
    const [userSettings, setUserSettings] = useState<UserSettings>();
    const [context, setContext] = useState<SubtitleSettingsContext>();
    const { __legacyApiClient__, user: currentUser } = useApi();

    useEffect(() => {
        if (!userId || !currentUser || !__legacyApiClient__) {
            return;
        }

        setLoading(true);

        void (async () => {
            const loaded = await loadSubtitleSettings({ api: __legacyApiClient__, currentUser, userId });
            setContext(loaded.context);
            setUserSettings(loaded.userSettings);
            setLoading(false);
        })();

        return () => {
            setLoading(false);
        };
    }, [__legacyApiClient__, currentUser, userId]);

    const saveSettings = useCallback(async (newValues: SubtitleSettingsValues) => {
        if (!userId || !userSettings || !__legacyApiClient__) {
            return;
        }
        return saveSubtitleSettings({
            api: __legacyApiClient__,
            newValues,
            userSettings,
            userId
        });
    }, [__legacyApiClient__, userSettings, userId]);

    return {
        loading,
        context,
        saveSubtitleSettings: saveSettings
    };
}

interface LoadParams {
    currentUser: UserDto;
    userId: string;
    api: ApiClient;
}

// Exported for testing: pure load mapping, no React involvement.
export async function loadSubtitleSettings({ currentUser, userId, api }: LoadParams) {
    const settings = (!userId || userId === currentUser?.Id) ? currentSettings : new UserSettings();
    const user = (!userId || userId === currentUser?.Id) ? currentUser : await api.getUser(userId);

    await settings.setUserInfo(userId, api);

    const cultures = await api.getCultures() as CultureDto[];
    const appearance = settings.getSubtitleAppearanceSettings(APPEARANCE_KEY) as StoredAppearanceSettings;

    const values: SubtitleSettingsValues = {
        subtitleLanguage: user.Configuration?.SubtitleLanguagePreference || '',
        subtitleMode: user.Configuration?.SubtitleMode || '',

        subtitleStyling: appearance.subtitleStyling || 'Auto',
        textSize: appearance.textSize || '',
        textWeight: appearance.textWeight || 'normal',
        dropShadow: appearance.dropShadow || '',
        font: appearance.font || '',
        textBackground: appearance.textBackground || 'transparent',
        textColor: appearance.textColor || '#ffffff',
        // Stored as a string historically; the slider works in numbers.
        verticalPosition: Number(appearance.verticalPosition ?? -3),

        subtitleBurnIn: appSettings.get('subtitleburnin') || '',
        subtitleRenderPgs: appSettings.get('subtitlerenderpgs') === 'true',
        alwaysBurnInSubtitleWhenTranscoding: appSettings.alwaysBurnInSubtitleWhenTranscoding(undefined)
    };

    const showBurnIn = Boolean(
        appHost.supports(AppFeature.SubtitleBurnIn) && user.Policy?.EnableVideoPlaybackTranscoding
    );
    const showAppearance = appHost.supports(AppFeature.SubtitleAppearance);

    const context: SubtitleSettingsContext = { values, cultures, showBurnIn, showAppearance };

    return { context, userSettings: settings };
}

interface SaveParams {
    api: ApiClient;
    newValues: SubtitleSettingsValues;
    userSettings: UserSettings;
    userId: string;
}

// Exported for testing: pure save mapping, no React involvement.
export async function saveSubtitleSettings({ api, newValues, userSettings, userId }: SaveParams) {
    // Device-level settings (appSettings)
    appSettings.set('subtitleburnin', newValues.subtitleBurnIn);
    appSettings.set('subtitlerenderpgs', String(newValues.subtitleRenderPgs));
    appSettings.alwaysBurnInSubtitleWhenTranscoding(newValues.alwaysBurnInSubtitleWhenTranscoding);

    // Appearance settings — merge into the stored object, preserving the
    // historical string shape for verticalPosition (helper parseInt's it).
    const appearance = userSettings.getSubtitleAppearanceSettings(APPEARANCE_KEY);
    userSettings.setSubtitleAppearanceSettings(Object.assign(appearance, {
        subtitleStyling: newValues.subtitleStyling,
        textSize: newValues.textSize,
        textWeight: newValues.textWeight,
        dropShadow: newValues.dropShadow,
        font: newValues.font,
        textBackground: newValues.textBackground,
        textColor: newValues.textColor,
        verticalPosition: String(newValues.verticalPosition)
    }), APPEARANCE_KEY);

    // User configuration (language + mode)
    const user = await api.getUser(userId);
    if (user.Id && user.Configuration) {
        user.Configuration.SubtitleLanguagePreference = newValues.subtitleLanguage;
        user.Configuration.SubtitleMode = newValues.subtitleMode as SubtitlePlaybackMode;
        await api.updateUserConfiguration(user.Id, user.Configuration);
    }
}
