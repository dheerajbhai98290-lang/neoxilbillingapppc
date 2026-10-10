const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('neoxil_session_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('neoxil_session_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('neoxil_session_token');
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/recover')) {
    removeAuthToken();
    window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    let errMessage = 'An unexpected error occurred';
    try {
      const errData = await res.json();
      errMessage = errData.error || errMessage;
    } catch (_) {}
    throw new Error(errMessage);
  }

  return res.json();
}
