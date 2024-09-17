import axios from 'axios';
import { getRequestFunction } from '../src/create';
import { createRequestFunction } from '../src/request';
import {
  createEconnresetInterceptor,
  createRefreshTokenInterceptor,
  createRequestDebugInterceptor,
  createResponseDebugInterceptor,
} from '../src/interceptors';
import { OpenApiClientOptions } from '../src/options';
import { serializeQueryParams } from '../src/query';

jest.mock('axios');
jest.mock('../src/request');
jest.mock('../src/interceptors');

const mockAxiosClient = {
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

describe('Create', () => {
  beforeEach(() => {
    (axios.create as jest.Mock).mockReturnValue(mockAxiosClient);
    (createRequestFunction as jest.Mock).mockReturnValue('mock-request');

    (createRefreshTokenInterceptor as jest.Mock).mockReturnValue({
      success: 'mock-refresh-access-token-interceptor:success',
      error: 'mock-refresh-access-token-interceptor:error',
    });

    (createEconnresetInterceptor as jest.Mock).mockReturnValue({
      success: 'mock-econnreset-interceptor:success',
      error: 'mock-econnreset-interceptor:error',
    });

    (createResponseDebugInterceptor as jest.Mock).mockReturnValue({
      success: 'mock-response-debug-interceptor:success',
      error: 'mock-response-debug-interceptor:error',
    });

    (createRequestDebugInterceptor as jest.Mock).mockReturnValue({
      success: 'mock-request-debug-interceptor:success',
      error: 'mock-request-debug-interceptor:error',
    });
  });

  describe('createOpenApiClient', () => {
    it('creates an axios instance', () => {
      const request = getRequestFunction('My API', '42.3.4', {
        baseURL: 'http://api.com',
        getAccessToken: () => null,
        refreshAccessToken: () => null,
      });

      expect(request).toBe('mock-request');

      expect(axios.create).toHaveBeenCalledTimes(1);
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://api.com',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.myapi+json; version=42.3.4',
        },
        paramsSerializer: expect.any(Function),
        timeout: 15000,
      });
    });

    it('sets up the default paramsSerializer as expected', () => {
      getRequestFunction('My API', '1.0.0', {
        baseURL: 'http://api.com',
        getAccessToken: () => null,
        refreshAccessToken: () => null,
      });

      const { paramsSerializer } = (axios.create as jest.Mock).mock.calls[0][0];

      expect(paramsSerializer({ foo: 'bar' })).toBe('foo=bar');
      expect(paramsSerializer({ foo: ['bar', 'baz'] })).toBe(
        'foo[]=bar&foo[]=baz',
      );
    });

    it('sets up a custom paramsSerializer as expected', () => {
      getRequestFunction('My API', '1.0.0', {
        baseURL: 'http://api.com',
        getAccessToken: () => null,
        refreshAccessToken: () => null,
        paramsSerializer: (params) => JSON.stringify(params),
      });

      const { paramsSerializer } = (axios.create as jest.Mock).mock.calls[0][0];

      expect(paramsSerializer({ foo: 'bar' })).toBe(
        JSON.stringify({ foo: 'bar' }),
      );
    });

    it('creates a client based on an axios instance', () => {
      const getAccessToken = () => null;
      const refreshAccessToken = () => null;

      getRequestFunction('My API', '1.0.0', {
        baseURL: 'http://api.com',
        basePath: '/path',
        getAccessToken,
        refreshAccessToken,
      });

      expect(createRequestFunction).toHaveBeenCalledTimes(1);
      expect(createRequestFunction).toHaveBeenCalledWith(
        mockAxiosClient,
        '/path',
        getAccessToken,
        refreshAccessToken,
      );
    });

    it('throws if no base URL given', () => {
      expect(() =>
        getRequestFunction('My API', '1.0.0', {
          getAccessToken: () => null,
          refreshAccessToken: () => null,
        } as unknown as OpenApiClientOptions),
      ).toThrow('A `baseURL` must be given');
    });

    it('registers the default interceptors', () => {
      const getAccessToken = () => null;
      const refreshAccessToken = () => null;
      const onError = () => null;
      const onClientError = () => null;
      const onTimeoutError = () => null;

      getRequestFunction('My API', '1.0.0', {
        baseURL: 'http://api.com',
        getAccessToken,
        refreshAccessToken,
        onError,
        onClientError,
        onTimeoutError,
      });

      expect(createRefreshTokenInterceptor).toHaveBeenCalledTimes(1);
      expect(createRefreshTokenInterceptor).toHaveBeenCalledWith(
        [401],
        refreshAccessToken,
      );

      expect(createEconnresetInterceptor).toHaveBeenCalledTimes(1);
      expect(createEconnresetInterceptor).toHaveBeenCalledWith();

      expect(createResponseDebugInterceptor).toHaveBeenCalledTimes(1);
      expect(createResponseDebugInterceptor).toHaveBeenCalledWith(
        onError,
        onClientError,
        onTimeoutError,
      );

      expect(mockAxiosClient.interceptors.response.use).toHaveBeenCalledTimes(
        3,
      );

      expect(mockAxiosClient.interceptors.response.use).toHaveBeenCalledWith(
        'mock-refresh-access-token-interceptor:success',
        'mock-refresh-access-token-interceptor:error',
      );

      expect(mockAxiosClient.interceptors.response.use).toHaveBeenCalledWith(
        'mock-econnreset-interceptor:success',
        'mock-econnreset-interceptor:error',
      );

      expect(mockAxiosClient.interceptors.response.use).toHaveBeenCalledWith(
        'mock-response-debug-interceptor:success',
        'mock-response-debug-interceptor:error',
      );
    });

    it('registers the request debug interceptor if an onRequest function is given', () => {
      const onRequest = jest.fn();

      getRequestFunction('My API', '1.0.0', {
        baseURL: 'http://api.com',
        onRequest,
      });

      expect(createRequestDebugInterceptor).toHaveBeenCalledTimes(1);
      expect(createRequestDebugInterceptor).toHaveBeenCalledWith(
        serializeQueryParams,
        onRequest,
      );

      expect(mockAxiosClient.interceptors.request.use).toHaveBeenCalledWith(
        'mock-request-debug-interceptor:success',
        'mock-request-debug-interceptor:error',
      );
    });

    it('includes a custom user agent', () => {
      const userAgent = 'My App/1.0.0';
      const request = getRequestFunction('My API', '42.3.4', {
        baseURL: 'http://api.com',
        userAgent,
      });

      expect(request).toBe('mock-request');

      expect(axios.create).toHaveBeenCalledTimes(1);
      expect(
        (axios.create as jest.Mock).mock.calls[0][0].headers,
      ).toMatchObject({
        'User-Agent': userAgent,
      });
    });

    it('includes an app version header', () => {
      const appVersion = 'v1.2.3';
      const request = getRequestFunction('My API', '42.3.4', {
        baseURL: 'http://api.com',
        appVersion,
      });

      expect(request).toBe('mock-request');

      expect(axios.create).toHaveBeenCalledTimes(1);
      expect(
        (axios.create as jest.Mock).mock.calls[0][0].headers,
      ).toMatchObject({
        'X-App-Version': appVersion,
      });
    });

    it('includes custom refresh status codes', () => {
      const refreshStatusCodes = [401, 403];
      const refreshAccessToken = () => null;

      getRequestFunction('My API', '1.0.0', {
        baseURL: 'http://api.com',
        refreshStatusCodes,
        refreshAccessToken,
      });

      expect(createRefreshTokenInterceptor).toHaveBeenCalledTimes(1);
      expect(createRefreshTokenInterceptor).toHaveBeenCalledWith(
        refreshStatusCodes,
        refreshAccessToken,
      );
    });

    it('includes custom request timeout', () => {
      const request = getRequestFunction('My API', '42.3.4', {
        baseURL: 'http://api.com',
        getAccessToken: () => null,
        refreshAccessToken: () => null,
        timeout: 100,
      });

      expect(request).toBe('mock-request');

      expect(axios.create).toHaveBeenCalledTimes(1);
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://api.com',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.myapi+json; version=42.3.4',
        },
        paramsSerializer: expect.any(Function),
        timeout: 100,
      });
    });

    it('does not include the timeout if it is an object', () => {
      const request = getRequestFunction('My API', '42.3.4', {
        baseURL: 'http://api.com',
        getAccessToken: () => null,
        refreshAccessToken: () => null,
        timeout: {
          get: 2000,
        },
      });

      expect(request).toBe('mock-request');

      expect(axios.create).toHaveBeenCalledTimes(1);
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://api.com',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.myapi+json; version=42.3.4',
        },
        paramsSerializer: expect.any(Function),
      });
    });
  });
});
