import { AxiosRequestConfig, AxiosInstance } from 'axios';
import { TokenRetrieverFunction, getAuthorizationHeader } from './auth';
import { OperationConfig } from './operations';

type OperationOption = Record<string, unknown> | null;

type OperationOptions = {
  data?: OperationOption;
  query?: OperationOption;
  params?: OperationOption;
};

/**
 * Slot path parameters into an endpoint.
 */
const populateEndpoint = (endpoint: string, options?: OperationOptions) => {
  let populatedEndpoint = endpoint;

  if (options?.params) {
    Object.entries(options.params)
      .filter(([, value]) => value != null && value !== '')
      .forEach(([key, value]) => {
        populatedEndpoint = populatedEndpoint.replace(
          new RegExp(`{${key}}`),
          String(value),
        );
      });
  }

  const remainingMatches = populatedEndpoint.match(/\{.*\}/g);

  if (remainingMatches?.length) {
    throw new Error(
      `Missing required path parameter(s): ${remainingMatches.join(', ')}`,
    );
  }

  return populatedEndpoint;
};

const trimSlashes = (endpoint: string) =>
  endpoint.replace(/\/+$/, '').replace(/^\/+/, '');

const getFullPath = (endpoint: string, basePath?: string) => {
  return basePath
    ? `/${trimSlashes(basePath)}/${trimSlashes(endpoint)}`
    : endpoint;
};

/**
 * Create the request function that is passed to the operations file.
 */
export const createRequestFunction =
  (
    axiosInstance: AxiosInstance,
    basePath?: string,
    getAccessToken?: TokenRetrieverFunction,
    refreshAccessToken?: TokenRetrieverFunction,
  ) =>
  async (operationConfig: OperationConfig, options?: OperationOptions) => {
    const { endpoint, method, secure } = operationConfig;
    const url = getFullPath(populateEndpoint(endpoint, options), basePath);
    const axiosRequestConfig: AxiosRequestConfig = {
      url,
      method,
    };

    if (options?.data && Object.keys(options.data).length) {
      axiosRequestConfig.data = options.data;
    }

    if (options?.query && Object.keys(options.query).length) {
      axiosRequestConfig.params = options.query;
    }

    const authorization = await getAuthorizationHeader(
      url,
      secure,
      getAccessToken,
      refreshAccessToken,
    );

    if (authorization) {
      axiosRequestConfig.headers = { Authorization: authorization };
    }

    const res = await axiosInstance.request(axiosRequestConfig);

    return res.data;
  };
