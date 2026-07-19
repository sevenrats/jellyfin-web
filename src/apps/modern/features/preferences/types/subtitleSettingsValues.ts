export interface SubtitleSettingsValues {
    // user.Configuration
    subtitleLanguage: string;
    subtitleMode: string;

    // userSettings subtitle appearance
    subtitleStyling: string;
    textSize: string;
    textWeight: string;
    dropShadow: string;
    font: string;
    textBackground: string;
    textColor: string;
    verticalPosition: number;

    // device-level (appSettings)
    subtitleBurnIn: string;
    subtitleRenderPgs: boolean;
    alwaysBurnInSubtitleWhenTranscoding: boolean;
}
