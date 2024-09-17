import { AxiosResponse } from 'axios';
import { OpenApiClientError, OpenApiClientTimeoutError } from '../errors';

export const createResponseDebugInterceptor = (
  onError?: (error: any) => void,
  onClientError?: (error: any) => void,
  onTimeoutError?: (error: any) => void,
) => ({
  success: (res: AxiosResponse) => res,
  error: (error: any) => {
    const { config, response, message, statusCode, code } = error;

    const { method } = config;
    const { data, status } = response || {};
    const finalStatus = status ?? statusCode;

    const isFiniteStatus = Number.isFinite(finalStatus);
    const isServerError = isFiniteStatus && finalStatus >= 500;
    const isClientError =
      isFiniteStatus && finalStatus >= 400 && finalStatus < 500;
    const isTimeoutError = code === 'ETIMEDOUT' || code === 'ECONNABORTED';

    const endpoint = `/${config.url}`.replace(/\/\//g, '/');
    const url = `${config.baseURL}${endpoint}`;
    const msg = `${finalStatus} ${
      data?.message || message
    } <${method.toUpperCase()} ${url}>`;

    const openApiClientError = new OpenApiClientError(finalStatus, msg, {
      type: data?.type,
      errors: data?.errors,
    });

    const logError = onError || console.error;
    const logClientError = onClientError || console.warn;
    const logTimeoutError = onTimeoutError || console.warn;

    if (isTimeoutError) {
      // Axios returns the timeout as code NOT statusCode
      const openApiTimeoutError = new OpenApiClientTimeoutError(message, code);

      logTimeoutError(openApiTimeoutError);

      throw openApiTimeoutError;
    }

    if (isServerError) {
      logError(openApiClientError);
    }

    if (isClientError) {
      logClientError(openApiClientError);
    }

    throw openApiClientError;
  },
});
