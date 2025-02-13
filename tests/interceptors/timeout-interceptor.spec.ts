import { InternalAxiosRequestConfig } from 'axios';
import { timeoutInterceptor } from '../../src/interceptors';
import { OpenApiClientOptions } from '../../src/options';

describe('timeout interceptor', () => {
  const timeout = {
    get: 2000,
    delete: 6000,
    put: 9000,
    post: undefined,
    patch: 3500,
  };

  it.each(Object.keys(timeout))(
    'handles timeouts if it is an object specifying which method should accept the timeout value',
    (method) => {
      const config = {
        method,
        url: '/endpoint',
        baseURL: 'http://example.com',
      };

      expect(
        timeoutInterceptor(timeout)(
          config as unknown as InternalAxiosRequestConfig,
        ),
      ).toHaveProperty(
        'timeout',
        timeout[method as keyof OpenApiClientOptions['timeout']],
      );
    },
  );
});
