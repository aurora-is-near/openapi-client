import { AxiosError, AxiosResponse } from 'axios';
import {
  OpenApiClientError,
  OpenApiClientTimeoutError,
} from '../../src/errors';
import { createResponseDebugInterceptor } from '../../src/interceptors';

const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('createResponseDebugInterceptor', () => {
  beforeEach(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('error', () => {
    it('logs a 500 error', async () => {
      console.error = jest.fn();

      const error = {
        response: {
          status: 500,
          data: {
            statusCode: 500,
            message: 'Internal Server Error',
            name: 'BadRequest',
            errors: [],
          },
        },
        config: {
          url: '/endpoint',
          baseURL: 'http://api.com',
          method: 'get',
        },
      } as unknown as AxiosError;

      const interceptor = createResponseDebugInterceptor();

      let err;

      try {
        interceptor.error(error);
      } catch (e) {
        err = e;
      }

      expect((err as OpenApiClientError).message).toBe(
        '500 Internal Server Error <GET http://api.com/endpoint>',
      );

      expect((err as OpenApiClientError).statusCode).toBe(500);
      expect((err as OpenApiClientError).name).toBe('OpenApiClientError');
      expect((err as OpenApiClientError).errors).toEqual([]);

      expect(console.error).toHaveBeenCalledTimes(1);
      expect((console.error as jest.Mock).mock.calls[0][0]).toMatchSnapshot();
    });

    it('logs a 400 error as a warning', async () => {
      console.warn = jest.fn();

      const errors = [
        {
          constraint: 'isInt',
          message: 'id must be an integer number',
          property: 'id',
        },
        {
          constraint: 'isString',
          message: 'name must be a string',
          property: 'name',
        },
      ];

      const error = {
        response: {
          status: 400,
          data: {
            statusCode: 400,
            message: 'Bad Request',
            name: 'BadRequest',
            type: '/probs/the-thing-expired',
            errors,
          },
        },
        config: {
          url: '/endpoint',
          baseURL: 'http://api.com',
          method: 'put',
        },
      } as unknown as AxiosError;

      const interceptor = createResponseDebugInterceptor();

      let err;

      try {
        interceptor.error(error);
      } catch (e) {
        err = e;
      }

      expect((err as OpenApiClientError).message).toBe(
        '400 Bad Request <PUT http://api.com/endpoint> id must be an integer number (id isInt), name must be a string (name isString)',
      );

      expect((err as OpenApiClientError).statusCode).toBe(400);
      expect((err as OpenApiClientError).name).toBe('OpenApiClientError');
      expect((err as OpenApiClientError).errors).toEqual(errors);
      expect((err as OpenApiClientError).type).toBe('/probs/the-thing-expired');

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect((console.warn as jest.Mock).mock.calls[0][0]).toMatchSnapshot();
    });

    it('logs a 500 error using a custom error handler', async () => {
      console.error = jest.fn();

      const error = {
        response: {
          status: 500,
          data: {
            statusCode: 500,
            message: 'Internal Server Error',
            name: 'BadRequest',
            errors: [],
          },
        },
        config: {
          url: '/endpoint',
          baseURL: 'http://api.com',
          method: 'post',
        },
      } as unknown as AxiosError;

      const onError = jest.fn();
      const interceptor = createResponseDebugInterceptor(onError);

      let err;

      try {
        interceptor.error(error);
      } catch (e) {
        err = e;
      }

      expect((err as OpenApiClientError).message).toBe(
        '500 Internal Server Error <POST http://api.com/endpoint>',
      );

      expect((err as OpenApiClientError).statusCode).toBe(500);
      expect((err as OpenApiClientError).name).toBe('OpenApiClientError');
      expect((err as OpenApiClientError).errors).toEqual([]);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(err);

      expect(console.error).not.toHaveBeenCalled();
    });

    it.each([undefined, {}, ''])(
      'logs an error when the API response data is "%s"',
      async (data) => {
        console.error = jest.fn();

        const error = {
          message: 'Bad thing',
          response: {
            status: 500,
            data,
          },
          config: {
            url: '/endpoint',
            baseURL: 'http://api.com',
            method: 'post',
          },
        } as unknown as AxiosError;

        const interceptor = createResponseDebugInterceptor();

        let err;

        try {
          interceptor.error(error);
        } catch (e) {
          err = e;
        }

        expect((err as OpenApiClientError).message).toBe(
          '500 Bad thing <POST http://api.com/endpoint>',
        );

        expect((err as OpenApiClientError).statusCode).toBe(500);
        expect((err as OpenApiClientError).name).toBe('OpenApiClientError');

        expect(console.error).toHaveBeenCalledTimes(1);
        expect((console.error as jest.Mock).mock.calls[0][0]).toMatchSnapshot();
      },
    );

    it('logs an error when the response body does not exist', async () => {
      console.error = jest.fn();

      const error = {
        statusCode: 500,
        message: 'Bad thing',
        config: {
          url: '/endpoint',
          baseURL: 'http://api.com',
          method: 'get',
        },
      } as unknown as AxiosError;

      const interceptor = createResponseDebugInterceptor();

      let err;

      try {
        interceptor.error(error);
      } catch (e) {
        err = e;
      }

      expect((err as OpenApiClientError).message).toBe(
        '500 Bad thing <GET http://api.com/endpoint>',
      );

      expect((err as OpenApiClientError).statusCode).toBe(500);
      expect((err as OpenApiClientError).name).toBe('OpenApiClientError');
      expect((err as OpenApiClientError).errors).toBeUndefined();

      expect(console.error).toHaveBeenCalledTimes(1);
      expect((console.error as jest.Mock).mock.calls[0][0]).toMatchSnapshot();
    });

    it.each(['ECONNABORTED', 'ETIMEDOUT'])(
      'logs a time out error as a warning when the code is "%s"',
      async (code) => {
        console.warn = jest.fn();

        const error = {
          code,
          message: 'Request aborted',
          config: {
            url: '/endpoint',
            baseURL: 'http://api.com',
            method: 'get',
          },
        } as unknown as AxiosError;

        const interceptor = createResponseDebugInterceptor();

        let err;

        try {
          interceptor.error(error);
        } catch (e) {
          err = e;
        }

        expect((err as OpenApiClientTimeoutError).message).toBe(
          'Request aborted',
        );

        expect((err as OpenApiClientTimeoutError).code).toBe(code);
        expect((err as OpenApiClientTimeoutError).name).toBe(
          'OpenApiClientTimeoutError',
        );

        expect(console.warn).toHaveBeenCalledTimes(1);
        expect((console.warn as jest.Mock).mock.calls[0][0]).toMatchSnapshot();
      },
    );

    it.each(['ECONNABORTED', 'ETIMEDOUT'])(
      'logs a timeout error using a custom timeout error handler when the code is "%s"',
      async (code) => {
        console.warn = jest.fn();

        const error = {
          code,
          message: 'Request aborted',
          config: {
            url: '/endpoint',
            baseURL: 'http://api.com',
            method: 'get',
          },
        } as unknown as AxiosError;

        const onClientError = jest.fn();
        const onError = jest.fn();
        const onTimeoutError = jest.fn();
        const interceptor = createResponseDebugInterceptor(
          onError,
          onClientError,
          onTimeoutError,
        );

        let err;

        try {
          interceptor.error(error);
        } catch (e) {
          err = e;
        }

        expect((err as OpenApiClientTimeoutError).message).toBe(
          'Request aborted',
        );

        expect((err as OpenApiClientTimeoutError).code).toBe(code);
        expect((err as OpenApiClientTimeoutError).name).toBe(
          'OpenApiClientTimeoutError',
        );

        expect(console.warn).not.toHaveBeenCalled();
        expect(onTimeoutError).toHaveBeenCalledTimes(1);
        expect(onTimeoutError).toHaveBeenCalledWith(err);
        expect(onClientError).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
      },
    );
  });

  describe('success', () => {
    it('returns the response on success', () => {
      const mockResponse = { foo: 'bar' };
      const interceptor = createResponseDebugInterceptor();

      const result = interceptor.success(
        mockResponse as unknown as AxiosResponse,
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
