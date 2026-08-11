function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;

        const payload = parts[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const normalized = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
        const decoded = atob(normalized);
        return JSON.parse(decodeURIComponent(decoded));
    } catch {
        return null;
    }
}

export function getStoredToken() {
    return localStorage.getItem('token');
}

export function clearAuthState() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('jobai-selected-job');
    localStorage.removeItem('jobai-resume-text');
    localStorage.removeItem('jobai-analysis-id');
}

export function hasValidToken() {
    const token = getStoredToken();
    if (!token) return false;

    const payload = decodeJwtPayload(token);
    if (!payload) {
        clearAuthState();
        return false;
    }

    const expiresAt = Number(payload.exp);
    if (Number.isFinite(expiresAt) && expiresAt * 1000 <= Date.now()) {
        clearAuthState();
        return false;
    }

    return true;
}

export function getAuthHeaders(extraHeaders = {}) {
    const token = getStoredToken();
    return {
        ...(token && hasValidToken() ? { Authorization: `Bearer ${token}` } : {}),
        ...extraHeaders
    };
}

export function redirectToLogin() {
    if (window.location.pathname !== '/login') {
        window.location.assign('/login');
    }
}
