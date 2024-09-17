import { AxiosError, AxiosResponse } from 'axios';
import {
  OpenApiClientError,
  OpenApiClientTimeoutError,
  ValidationError,
} from '../errors';

type ResponseError = AxiosError<
  { message?: string; type?: string; errors?: ValidationError[] },
  { method: string; url: string; baseURL: string }
> & {
  statusCode: number;
};

export const createResponseDebugInterceptor = (
  onError?: (error: unknown) => void,
  onClientError?: (error: unknown) => void,
  onTimeoutError?: (error: unknown) => void,
) => ({
  success: (res: AxiosResponse) => res,
  error: (error: ResponseError) => {
    const { config, response, message, statusCode, code } = error;

    const { url, method, baseURL } = config ?? {};
    const { data, status } = response ?? {};
    const finalStatus = status ?? statusCode;

    const isFiniteStatus = Number.isFinite(finalStatus);
    const isServerError = isFiniteStatus && finalStatus >= 500;
    const isClientError =
      isFiniteStatus && finalStatus >= 400 && finalStatus < 500;

    const isTimeoutError = code === 'ETIMEDOUT' || code === 'ECONNABORTED';

    const endpoint = `/${url}`.replace(/\/\//g, '/');
    const fullUrl = `${baseURL}${endpoint}`;
    const msg = `${finalStatus} ${
      data?.message ?? message
    } <${method?.toUpperCase()} ${fullUrl}>`;

    const openApiClientError = new OpenApiClientError(finalStatus, msg, {
      type: data?.type,
      errors: data?.errors,
    });

    /* eslint-disable no-console */
    const logError = onError ?? console.error;
    const logClientError = onClientError ?? console.warn;
    const logTimeoutError = onTimeoutError ?? console.warn;
    /* eslint-enable no-console */

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
