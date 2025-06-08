
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  try {
    return session.access_token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    // Only log endpoint in development mode
    if (process.env.NODE_ENV === 'development') {
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors',
    });

    if (!response.ok) {
      let errorMessage = '';
      try {
        const errorData = await response.text();
        errorMessage = errorData;
      } catch (e) {
        errorMessage = 'Unknown error';
      }
      // Only log detailed errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`API error: ${response.status}`, errorMessage);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Only log detailed errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API request failed:', error);
    }
    throw error;
  }
}

export const api = {
  get: (endpoint: string) => fetchWithAuth(endpoint),
  post: (endpoint: string, data: unknown) =>
    fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  put: (endpoint: string, data: unknown) =>
    fetchWithAuth(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (endpoint: string) =>
    fetchWithAuth(endpoint, {
      method: 'DELETE',
    }),
};
