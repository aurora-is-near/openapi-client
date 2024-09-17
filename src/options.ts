import { TokenRetrieverFunction } from './auth';
import { OpenApiClientError, OpenApiClientTimeoutError } from './errors';
import { OnRequestFunction } from './interceptors/request-debug-interceptor';

type ParamsSerializer = {
  (params: Record<string, unknown>): string;
};

export type Timeout = Partial<{
  get: number;
  post: number;
  put: number;
  patch: number;
  delete: number;
}>;

export type OpenApiClientOptions = {
  baseURL: string;
  basePath?: string;
  getAccessToken?: TokenRetrieverFunction;
  refreshAccessToken?: TokenRetrieverFunction;
  onError?: (error: OpenApiClientError) => void;
  onClientError?: (error: OpenApiClientError) => void;
  onTimeoutError?: (error: OpenApiClientTimeoutError) => void;
  onUpgradeRequired?: () => void;
  onRequest?: OnRequestFunction;
  paramsSerializer?: ParamsSerializer;
  userAgent?: string;
  appVersion?: string;
  refreshStatusCodes?: number[];
  timeout?: number | Timeout;
};
