import { useEffect } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import inputManager from 'scripts/inputManager';

interface UseInputCommandsOptions {
    show: () => void;
    hide: () => void;
    isVisible: () => boolean;
}

const player = () => playbackManager.getCurrentPlayer();

// Commands that only need to reveal the OSD.
const SHOW_ONLY = new Set([
    'up', 'down', 'select', 'menu', 'info', 'play', 'playpause',
    'pause', 'fastforward', 'rewind', 'next', 'previous'
]);

/**
 * Ports the ready subset of the legacy OSD onInputCommand (index.js:410-474):
 * left/right seek, pageup/pagedown chapters, back-to-hide, and the show-only
 * group. Deferred: 'togglestats' (B4), 'record' (B5).
 */
export function useInputCommands({ show, hide, isVisible }: UseInputCommandsOptions) {
    useEffect(() => {
        const onCommand = (e: CustomEvent<{ command: string }>) => {
            const p = player();
            const command = e.detail?.command;

            switch (command) {
                case 'left':
                    if (isVisible()) {
                        show();
                    } else {
                        e.preventDefault();
                        playbackManager.rewind(p);
                    }
                    break;
                case 'right':
                    if (isVisible()) {
                        show();
                    } else {
                        e.preventDefault();
                        playbackManager.fastForward(p);
                    }
                    break;
                case 'pageup':
                    playbackManager.nextChapter(p);
                    break;
                case 'pagedown':
                    playbackManager.previousChapter(p);
                    break;
                case 'back':
                    if (isVisible()) {
                        hide();
                        e.preventDefault();
                    }
                    break;
                default:
                    if (command && SHOW_ONLY.has(command)) {
                        show();
                    }
                    // Deferred: 'togglestats' (B4), 'record' (B5).
                    break;
            }
        };

        inputManager.on(window, onCommand);
        return () => inputManager.off(window, onCommand);
    }, [show, hide, isVisible]);
}
