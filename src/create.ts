import axios, { AxiosInstance, RawAxiosRequestHeaders } from 'axios';
import { noCase } from 'change-case';
import { createRequestFunction } from './request';
import {
  createRefreshTokenInterceptor,
  createEconnresetInterceptor,
  createResponseDebugInterceptor,
  createRequestDebugInterceptor,
  timeoutInterceptor,
} from './interceptors';
import { serializeQueryParams } from './query';
import { OpenApiClientOptions } from './options';

const DEFAULT_REFRESH_STATUS_CODES = [401];
const DEFAULT_REQUEST_TIMEOUT = 15000;

/**
 * Create the base axios instance.
 */
const createAxiosInstance = (
  {
    baseURL,
    refreshAccessToken,
    onError,
    onClientError,
    onTimeoutError,
    onRequest,
    paramsSerializer = serializeQueryParams,
    userAgent,
    appVersion,
    refreshStatusCodes = DEFAULT_REFRESH_STATUS_CODES,
    timeout = DEFAULT_REQUEST_TIMEOUT,
  }: OpenApiClientOptions,
  version: string,
  title: string,
): AxiosInstance => {
  if (!baseURL) {
    throw new Error('A `baseURL` must be given');
  }

  const headers: RawAxiosRequestHeaders = {
    'Content-Type': 'application/json',
    Accept: `application/vnd.${noCase(title).replace(
      /\s+/g,
      '',
    )}+json; version=${version}`,
  };

  if (userAgent) {
    headers['User-Agent'] = userAgent;
  }

  if (appVersion) {
    headers['X-App-Version'] = appVersion;
  }

  const axiosInstance = axios.create({
    baseURL,
    headers,
    paramsSerializer,
    timeout: typeof timeout === 'number' ? timeout : undefined,
  });

  if (typeof timeout === 'object') {
    axiosInstance.interceptors.request.use(timeoutInterceptor(timeout));
  }

  const refreshTokenInterceptor = createRefreshTokenInterceptor(
    refreshStatusCodes,
    refreshAccessToken,
  );

  const econnresetInterceptor = createEconnresetInterceptor();
  const responseDebugInterceptor = createResponseDebugInterceptor(
    onError,
    onClientError,
    onTimeoutError,
  );

  axiosInstance.interceptors.response.use(
    refreshTokenInterceptor.success,
    refreshTokenInterceptor.error,
  );

  axiosInstance.interceptors.response.use(
    econnresetInterceptor.success,
    econnresetInterceptor.error,
  );

  axiosInstance.interceptors.response.use(
    responseDebugInterceptor.success,
    responseDebugInterceptor.error,
  );

  if (onRequest) {
    const requestDebugInterceptor = createRequestDebugInterceptor(
      paramsSerializer,
      onRequest,
    );

    axiosInstance.interceptors.request.use(
      requestDebugInterceptor.success,
      requestDebugInterceptor.error,
    );
  }

  return axiosInstance;
};

/**
 * Get the function for making API requests for a particular client.
 */
export const getRequestFunction = (
  title: string,
  version: string,
  options: OpenApiClientOptions,
) => {
  const axiosInstance = createAxiosInstance(options, version, title);

  return createRequestFunction(
    axiosInstance,
    options.basePath,
    options.getAccessToken,
    options.refreshAccessToken,
  );
};
