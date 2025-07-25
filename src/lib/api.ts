import ky from 'ky';
import { IS_DEV } from './utils';

const api = ky.create({
  prefixUrl: '/api',
  credentials: 'include', // ⬅️ Needed if using cookies
  hooks: {
    afterResponse: [
      async (request, options, response) => {
        // If the response is 401, and we haven't already retried
        if (response.status === 401) {
          if (IS_DEV) {
            console.log('[API Client] Access token expired. Attempting to refresh...');
          }
          try {
            // Attempt to refresh the token.
            // We use ky.post directly to avoid an infinite loop of hooks.
            const refreshResponse = await ky.post('/api/auth/refresh');

            if (refreshResponse.ok) {
              if (IS_DEV) {
                console.log('[API Client] Token refreshed successfully. Retrying original request.');
              }
              // Retry the original request. The browser will have the new access_token cookie.
              return api(request.url, {
                ...request,
                retry: 0, // disable retry logic
                hooks: undefined, // prevent recursive hook execution
              });

            }
          } catch (error) {
            if (IS_DEV) {
              console.error('[API Client] Failed to refresh token:', error);
            }
            // If refresh fails, redirect to login
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        }
        return response;
      },
    ],
  },
});

export default api;
