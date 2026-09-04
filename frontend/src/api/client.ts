export class ApiError extends Error {
  public status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function apiClient<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      errorMessage = data.message || data.error || errorMessage;
    } catch {
      // response body is not JSON, use statusText
    }
    throw new ApiError(errorMessage, response.status);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}
