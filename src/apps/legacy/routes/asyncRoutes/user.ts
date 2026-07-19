import { AsyncRoute } from '../../../../components/router/AsyncRoute';
import { AppType } from '../../../../constants/appType';

export const ASYNC_USER_ROUTES: AsyncRoute[] = [
    { path: 'mypreferencesmenu', page: 'user/settings' },
    { path: 'mypreferencessubtitles', page: 'user/subtitles', type: AppType.Modern },
    { path: 'quickconnect', page: 'quickConnect' },
    { path: 'search', page: 'search' },
    { path: 'userprofile', page: 'user/userprofile' }
];
