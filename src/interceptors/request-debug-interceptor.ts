import { CustomParamsSerializer, InternalAxiosRequestConfig } from 'axios';

export type OnRequestFunction = ({
  method,
  url,
}: {
  method: string;
  url: URL;
}) => void;

/**
 * Axios interceptor to log requests.
 */
export const createRequestDebugInterceptor = (
  paramsSerializer: CustomParamsSerializer,
  onRequest: OnRequestFunction,
) => ({
  success: (config: InternalAxiosRequestConfig) => {
    const { baseURL, method, url, params } = config;

    if (!url || !method) {
      return config;
    }

    const urlObj = new URL(url, baseURL);

    if (params) {
      urlObj.search = `?${paramsSerializer(params)}`;
    }

    onRequest({
      method: method.toUpperCase(),
      url: urlObj,
    });

    return config;
  },
  error: (error: any) => Promise.reject(error),
});
