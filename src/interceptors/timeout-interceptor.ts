import { InternalAxiosRequestConfig } from 'axios';
import { Timeout } from '../options';

export const timeoutInterceptor =
  (timeout: Timeout) => (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase() ?? '';

    if (method in timeout) {
      config.timeout = timeout[method as keyof typeof timeout];

      return config;
    }

    return config;
  };
