import React, { useEffect, useRef, useState } from 'react';

import { ServerConnections } from 'lib/jellyfin-apiclient';

interface ProgramItem {
    Type?: string;
    Id?: string;
    ServerId?: string;
}

interface RecordingButtonInstance {
    refreshItem: (item: unknown) => void;
    destroy: () => void;
}

interface RecordButtonProps {
    /** The now-playing display item; only live-TV Programs get a record button. */
    item: ProgramItem | null;
}

/**
 * Record button for live-TV programs. Renders the button node and drives the
 * existing RecordingButton engine (recordingbutton.js) against it — the engine
 * only toggles classes on the node (no HTML injection), matching the island
 * pattern used elsewhere in the OSD (useUpNext mounting UpNextDialog).
 *
 * Only shown when the item is a Program AND the user has EnableLiveTvManagement,
 * mirroring the legacy updateRecordingButton gate (index.js:58-85).
 */
export default function RecordButton({ item }: Readonly<RecordButtonProps>) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const managerRef = useRef<RecordingButtonInstance | null>(null);
    const [canManage, setCanManage] = useState(false);

    const isProgram = item?.Type === 'Program';
    const serverId = item?.ServerId;
    const itemId = item?.Id;

    // Resolve whether the current user may manage live-TV recordings.
    useEffect(() => {
        if (!isProgram || !serverId) {
            setCanManage(false);
            return;
        }

        let cancelled = false;
        const apiClient = ServerConnections.getApiClient(serverId);
        apiClient?.getCurrentUser().then((user: { Policy?: { EnableLiveTvManagement?: boolean } }) => {
            if (!cancelled) {
                setCanManage(!!user.Policy?.EnableLiveTvManagement);
            }
        }).catch(() => {
            if (!cancelled) {
                setCanManage(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [isProgram, serverId, itemId]);

    // Mount/refresh/destroy the RecordingButton engine on the rendered node.
    useEffect(() => {
        if (!canManage || !isProgram || !buttonRef.current) {
            return;
        }

        const button = buttonRef.current;
        let cancelled = false;

        import('components/recordingcreator/recordingbutton').then(({ default: RecordingButton }) => {
            if (cancelled) {
                return;
            }

            if (managerRef.current) {
                managerRef.current.refreshItem(item);
                return;
            }

            managerRef.current = new RecordingButton({ item, button }) as RecordingButtonInstance;
        }).catch(err => {
            console.error('[VideoOsd] failed to load recording button', err);
        });

        return () => {
            cancelled = true;
        };
    }, [canManage, isProgram, item]);

    // Tear down the engine when the button unmounts (item stops being a Program).
    useEffect(() => () => {
        managerRef.current?.destroy();
        managerRef.current = null;
    }, []);

    if (!canManage || !isProgram) {
        return null;
    }

    return (
        <button
            ref={buttonRef}
            is='paper-icon-button-light'
            type='button'
            className='btnRecord autoSize paper-icon-button-light'
        >
            <span className='xlargePaperIconButton material-icons fiber_manual_record' aria-hidden='true' />
        </button>
    );
}
