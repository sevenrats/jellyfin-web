import { describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => {
    const appSettingsStore: Record<string, string> = { subtitleburnin: 'all', subtitlerenderpgs: 'true' };
    const savedAppearance: Record<string, unknown> = {};
    const userSettingsInstance = {
        setUserInfo: vi.fn(() => Promise.resolve()),
        getSubtitleAppearanceSettings: vi.fn(() => ({ verticalPosition: '5', textSize: 'large', font: 'console' })),
        setSubtitleAppearanceSettings: vi.fn((val: Record<string, unknown>) => { Object.assign(savedAppearance, val); })
    };
    return { appSettingsStore, savedAppearance, userSettingsInstance };
});

vi.mock('scripts/settings/appSettings', () => ({ default: {
    get: (k: string) => h.appSettingsStore[k],
    set: vi.fn((k: string, v: string) => { h.appSettingsStore[k] = v; }),
    alwaysBurnInSubtitleWhenTranscoding: vi.fn(() => true)
} }));
vi.mock('scripts/settings/userSettings', () => ({
    currentSettings: h.userSettingsInstance,
    UserSettings: function () { return h.userSettingsInstance; }
}));
vi.mock('components/apphost', () => ({ appHost: { supports: () => true } }));
vi.mock('constants/appFeature', () => ({ AppFeature: { SubtitleBurnIn: 'b', SubtitleAppearance: 'a' } }));
// hooks/useApi is imported by the module but not used by the pure functions; stub to avoid load cost.
vi.mock('hooks/useApi', () => ({ useApi: () => ({}) }));

import { loadSubtitleSettings, saveSubtitleSettings } from 'apps/modern/features/preferences/hooks/useSubtitleSettings';

describe('useSubtitleSettings load/save mapping', () => {
    const currentUser = { Id: 'u1', Configuration: { SubtitleLanguagePreference: 'eng', SubtitleMode: 'Smart' }, Policy: { EnableVideoPlaybackTranscoding: true } };

    it('loadSubtitleSettings maps all sources into a values object', async () => {
        const api = {
            getCultures: vi.fn(() => Promise.resolve([{ DisplayName: 'English', ThreeLetterISOLanguageName: 'eng' }])),
            getUser: vi.fn(() => Promise.resolve(currentUser))
        };
        const { context } = await loadSubtitleSettings({ currentUser, userId: 'u1', api } as never);
        const v = context.values;
        expect(v.subtitleLanguage).toBe('eng');
        expect(v.subtitleMode).toBe('Smart');
        expect(v.textSize).toBe('large');
        expect(v.font).toBe('console');
        // Number-coerced from the stored '5' string
        expect(v.verticalPosition).toBe(5);
        expect(v.subtitleBurnIn).toBe('all');
        // 'true' string -> boolean
        expect(v.subtitleRenderPgs).toBe(true);
        expect(v.alwaysBurnInSubtitleWhenTranscoding).toBe(true);
        expect(context.showBurnIn).toBe(true);
        expect(context.showAppearance).toBe(true);
        expect(context.cultures).toHaveLength(1);
    });

    it('saveSubtitleSettings writes to appSettings, appearance, and user config', async () => {
        const updateUserConfiguration =
            vi.fn<(userId: string, config: Record<string, unknown>) => Promise<void>>(() => Promise.resolve());
        const api = {
            getUser: vi.fn(() => Promise.resolve({ Id: 'u1', Configuration: { SubtitleLanguagePreference: 'eng', SubtitleMode: 'Smart' } })),
            updateUserConfiguration
        };
        const newValues = {
            subtitleLanguage: 'fre', subtitleMode: 'Always',
            subtitleStyling: 'Custom', textSize: 'small', textWeight: 'bold',
            dropShadow: 'raised', font: 'print', textBackground: '#000', textColor: '#ff0000',
            verticalPosition: -8, subtitleBurnIn: 'onlyimageformats',
            subtitleRenderPgs: false, alwaysBurnInSubtitleWhenTranscoding: true
        };
        await saveSubtitleSettings({ api, newValues, userSettings: h.userSettingsInstance, userId: 'u1' } as never);

        // verticalPosition persisted as STRING (legacy shape the helper parseInt's)
        expect(h.savedAppearance.verticalPosition).toBe('-8');
        expect(h.savedAppearance.textColor).toBe('#ff0000');
        expect(h.savedAppearance.font).toBe('print');
        // device settings
        expect(h.appSettingsStore.subtitleburnin).toBe('onlyimageformats');
        expect(h.appSettingsStore.subtitlerenderpgs).toBe('false');
        // user config
        expect(updateUserConfiguration).toHaveBeenCalledTimes(1);
        expect(updateUserConfiguration).toHaveBeenCalledWith('u1', expect.objectContaining({
            SubtitleLanguagePreference: 'fre',
            SubtitleMode: 'Always'
        }));
    });
});
