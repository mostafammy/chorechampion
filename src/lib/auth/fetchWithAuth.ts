export async function fetchWithAuth(input: RequestInfo, init?: RequestInit, retry = true): Promise<Response> {
    const res = await fetch(input, {
        ...init,
        credentials: 'include', // include cookies (important!)
    });

    // Token expired or unauthorized
    if (res.status === 401 && retry) {
        console.warn('[fetchWithAuth] Access token expired. Attempting refresh...');

        // Call refresh endpoint
        const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });

        if (refreshRes.ok) {
            console.info('[fetchWithAuth] Refresh success. Retrying original request...');
            // Retry the original request (only once)
            return fetchWithAuth(input, init, false);
        } else {
            console.error('[fetchWithAuth] Refresh failed. User may be logged out.');
            // Optionally redirect to login
            window.location.href = '/login';
            throw new Error('Session expired');
        }
    }

    return res;
}
