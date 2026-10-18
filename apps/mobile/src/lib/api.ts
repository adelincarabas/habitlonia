import { createApiClient } from '@habitlonia/shared';
import { getToken } from './session';

let unauthorizedHandler: (() => void) | undefined;

/** The auth provider registers itself here so an expired token logs the user out. */
export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

export const apiClient = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000', {
  getToken,
  onUnauthorized: () => unauthorizedHandler?.(),
});
