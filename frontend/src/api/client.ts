export class ApiError extends Error {
  public status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

import { translate, type Language } from '../i18n/translations';

export function userFacingError(error: unknown, language: Language = 'id'): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return translate(language, 'errors.session');
    if (error.status === 403) return translate(language, 'errors.access');
    if (error.status === 404) return translate(language, 'errors.notFound');
    if (error.status && error.status >= 500) return translate(language, 'errors.server');
    return error.message || translate(language, 'errors.request');
  }
  return translate(language, 'errors.network');
}

export async function apiClient<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: isFormData ? options.headers : {
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
