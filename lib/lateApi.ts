import { config } from './config';

export async function lateApiRequest<T = unknown>(
  endpoint: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {}
): Promise<T> {
  const url = `${config.LATE_API_URL}${endpoint}`;
  const { method = 'GET', body, headers: customHeaders = {} } = options;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${config.LATE_API_KEY}`,
      'Content-Type': 'application/json',
      ...customHeaders,
    },
  };
  if (body && method !== 'GET') {
    fetchOptions.body = body;
  }

  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    let errorText: string;
    try {
      const errorJson = await response.json();
      errorText = JSON.stringify(errorJson);
    } catch {
      errorText = await response.text();
    }
    throw new Error(`Late API error (${response.status}): ${errorText}`);
  }
  return response.json() as Promise<T>;
}
