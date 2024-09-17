import axios, { AxiosError, AxiosResponse } from 'axios';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _econnresetRetry?: boolean;
  }
}

/**
 * Axios interceptor to retry ECONNRESET errors once.
 *
 * @see https://github.com/node-modules/agentkeepalive/blob/01e61e9/README.md#support-reqreusedsocket
 */
export const createEconnresetInterceptor = () => ({
  success: (res: AxiosResponse) => res,
  error: (error: AxiosError) => {
    const { config, request, code } = error;
    const { reusedSocket } = request || {};

    if (
      reusedSocket &&
      code === 'ECONNRESET' &&
      config &&
      !config._econnresetRetry
    ) {
      config._econnresetRetry = true;

      return axios(config);
    }

    return Promise.reject(error);
  },
});
