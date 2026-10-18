import { createApiClient } from '@habitlonia/shared';

export const apiClient = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000');
