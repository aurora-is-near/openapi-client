import { InternalAxiosRequestConfig } from 'axios';
import qs from 'qs';
import { createRequestDebugInterceptor } from '../../src/interceptors';

const originalConsoleError = console.error;

describe('createRequesteDebugInterceptor', () => {
  beforeEach(() => {
    console.error = originalConsoleError;
  });

  describe('success', () => {
    it('logs a request', () => {
      const paramsSerializer = jest.fn();
      const config = {
        method: 'get',
        url: '/endpoint',
        baseURL: 'http://example.com',
      };

      const onRequest = jest.fn();

      expect(
        createRequestDebugInterceptor(paramsSerializer, onRequest).success(
          config as unknown as InternalAxiosRequestConfig,
        ),
      ).toEqual(config);

      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(onRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: new URL('http://example.com/endpoint'),
      });
    });

    it('logs a request with query params and the given serializer', () => {
      const paramsSerializer = (params: Record<string, unknown>) =>
        qs.stringify(params, { arrayFormat: 'comma' });

      const config = {
        method: 'get',
        url: '/endpoint',
        baseURL: 'http://example.com',
        params: {
          arr: [1, 2],
          limit: 1,
          filter: {
            foo: 'bar',
          },
        },
      };

      const onRequest = jest.fn();

      createRequestDebugInterceptor(paramsSerializer, onRequest).success(
        config as unknown as InternalAxiosRequestConfig,
      );

      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(onRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: new URL(
          'http://example.com/endpoint?arr=1%2C2&limit=1&filter%5Bfoo%5D=bar',
        ),
      });
    });
  });

  describe('error', () => {
    it('rejects an error', async () => {
      const err = new Error('Bad thing');
      const paramsSerializer = jest.fn();
      const onRequest = jest.fn();
      const interceptor = createRequestDebugInterceptor(
        paramsSerializer,
        onRequest,
      );

      await expect(async () => interceptor.error(err)).rejects.toThrow(err);
      expect(onRequest).not.toHaveBeenCalled();
    });
  });
});
