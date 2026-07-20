import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import React, { useCallback, useEffect, useRef, useState, type FC } from 'react';

import RemotePlayButton from 'apps/modern/components/AppToolbar/RemotePlayButton';
import SyncPlayButton from 'apps/modern/components/AppToolbar/SyncPlayButton';
import Page from 'components/Page';
import AppToolbar from 'components/toolbar/AppToolbar';
import { EventType } from 'constants/eventType';
import Events, { type Event } from 'utils/events';

import { useVideoPlayerLifecycle } from '../hooks/useVideoPlayerLifecycle';
import VideoOsd from './VideoOsd';

/**
 * The video player page for both apps (modern desktop + legacy TV). A generic
 * React `Page` (fires the view lifecycle + media-control/theme-media signals)
 * hosting the MUI header (title + SyncPlay/RemotePlay) and the React
 * `VideoOsd`. `useVideoPlayerLifecycle` owns fullscreen / backdrop / player
 * binding / stop-on-back. No controller, no index.html, no ViewManagerPage.
 *
 * The header title + visibility are fed by the OSD's React hooks
 * (VIDEO_TITLE_CHANGE / SHOW_VIDEO_OSD), proving the item-4 event-ownership move
 * end-to-end.
 */
const VideoPlayerPage: FC = () => {
    const documentRef = useRef<Document>(document);
    const [ isVisible, setIsVisible ] = useState(true);
    const [ videoTitle, setVideoTitle ] = useState<string>('');

    useVideoPlayerLifecycle();

    const onShowVideoOsd = useCallback((_e: Event, isShowing: boolean) => {
        setIsVisible(isShowing);
    }, []);

    const onTitleChange = useCallback((_e: Event, title: string) => {
        setVideoTitle(title);
    }, []);

    useEffect(() => {
        const doc = documentRef.current;
        Events.on(doc, EventType.SHOW_VIDEO_OSD, onShowVideoOsd);
        Events.on(doc, EventType.VIDEO_TITLE_CHANGE, onTitleChange);

        return () => {
            Events.off(doc, EventType.SHOW_VIDEO_OSD, onShowVideoOsd);
            Events.off(doc, EventType.VIDEO_TITLE_CHANGE, onTitleChange);
        };
    }, [ onShowVideoOsd, onTitleChange ]);

    return (
        <Page
            id='videoOsdPage'
            className='libraryPage'
            isNowPlayingBarEnabled={false}
            isThemeMediaSupported
            isBackButtonEnabled
        >
            <Fade
                in={isVisible}
                easing='fade-out'
            >
                <Box
                    className='skinHeader skinHeader-withBackground skinHeader-blurred osdHeader'
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        color: 'white',
                        pointerEvents: 'unset !important'
                    }}
                >
                    <AppToolbar
                        isDrawerAvailable={false}
                        isDrawerOpen={false}
                        isBackButtonAvailable
                        isUserMenuAvailable={false}
                        buttons={
                            <>
                                <SyncPlayButton />
                                <RemotePlayButton />
                            </>
                        }
                        className='padded-left padded-right'
                    >
                        <Typography>{videoTitle}</Typography>
                    </AppToolbar>
                </Box>
            </Fade>

            <VideoOsd />
        </Page>
    );
};

export default VideoPlayerPage;
