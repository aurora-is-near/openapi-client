import axios from 'axios';
import { getAuthorizationHeader } from '../src/auth';
import { createRequestFunction } from '../src/request';

jest.mock('../src/auth');

const axiosInstance = axios.create();
const requestSpy = jest.spyOn(axiosInstance, 'request');

describe('Request', () => {
  beforeEach(() => {
    requestSpy.mockImplementation(async () => ({
      data: 'mock-response',
    }));
  });

  describe('createRequestFunction', () => {
    it('makes a request based on the given operation config', async () => {
      const request = createRequestFunction(axiosInstance);

      const response = await request({
        endpoint: '/my-get-endpoint',
        method: 'get',
        secure: false,
      });

      expect(response).toBe('mock-response');
      expect(axiosInstance.request).toHaveBeenCalledTimes(1);
      expect(axiosInstance.request).toHaveBeenCalledWith({
        url: '/my-get-endpoint',
        method: 'get',
      });
    });

    it.each(['path', '/path', '/path/'])(
      'makes a request with the base path "%s"',
      async (basePath) => {
        const request = createRequestFunction(axiosInstance, basePath);

        const response = await request({
          endpoint: '/my-get-endpoint',
          method: 'get',
          secure: false,
        });

        expect(response).toBe('mock-response');
        expect(axiosInstance.request).toHaveBeenCalledTimes(1);
        expect(axiosInstance.request).toHaveBeenCalledWith({
          url: '/path/my-get-endpoint',
          method: 'get',
        });
      },
    );

    it('makes a request with path and query parameters', async () => {
      const request = createRequestFunction(axiosInstance);
      const options = {
        params: {
          id: 123,
        },
        query: {
          foo: 'bar',
        },
      } as any;

      const response = await request(
        {
          endpoint: '/user/{id}',
          method: 'get',
          secure: false,
        },
        options,
      );

      expect(response).toBe('mock-response');
      expect(axiosInstance.request).toHaveBeenCalledTimes(1);
      expect(axiosInstance.request).toHaveBeenCalledWith({
        url: '/user/123',
        method: 'get',
        params: {
          foo: 'bar',
        },
      });
    });

    it.each([null, undefined, ''])(
      'throws if a path parameter is %s',
      async (value) => {
        const request = createRequestFunction(axiosInstance);
        const options = {
          params: {
            id: value,
          },
        } as any;

        await expect(async () =>
          request(
            {
              endpoint: '/user/{id}',
              method: 'get',
              secure: false,
            },
            options,
          ),
        ).rejects.toThrow('Missing required path parameter(s): {id}');
      },
    );

    it.each([0, false])(
      'includes a path parameter that is "%s"',
      async (value) => {
        const request = createRequestFunction(axiosInstance);
        const options = {
          params: {
            id: value,
          },
        } as any;

        const response = await request(
          {
            endpoint: '/user/{id}',
            method: 'get',
            secure: false,
          },
          options,
        );

        expect(response).toBe('mock-response');
        expect(axiosInstance.request).toHaveBeenCalledTimes(1);
        expect(axiosInstance.request).toHaveBeenCalledWith({
          url: `/user/${value}`,
          method: 'get',
        });
      },
    );

    it('makes a request with data', async () => {
      const request = createRequestFunction(axiosInstance);
      const options = {
        data: {
          foo: 'bar',
        },
      } as any;

      const response = await request(
        {
          endpoint: '/my-endpoint',
          method: 'post',
          secure: false,
        },
        options,
      );

      expect(response).toBe('mock-response');
      expect(axiosInstance.request).toHaveBeenCalledTimes(1);
      expect(axiosInstance.request).toHaveBeenCalledWith({
        url: '/my-endpoint',
        method: 'post',
        data: {
          foo: 'bar',
        },
      });
    });

    it.each([null, undefined, {}])(
      'ignores a query given as %s',
      async (query) => {
        const request = createRequestFunction(axiosInstance);
        const options = {
          query,
        } as any;

        const response = await request(
          {
            endpoint: '/my-endpoint',
            method: 'get',
            secure: false,
          },
          options,
        );

        expect(response).toBe('mock-response');
        expect(axiosInstance.request).toHaveBeenCalledTimes(1);
        expect(axiosInstance.request).toHaveBeenCalledWith({
          url: '/my-endpoint',
          method: 'get',
        });
      },
    );

    it.each([null, undefined, {}])('ignores data given as %s', async (data) => {
      const request = createRequestFunction(axiosInstance);
      const options = {
        data,
      } as any;

      const response = await request(
        {
          endpoint: '/my-endpoint',
          method: 'get',
          secure: false,
        },
        options,
      );

      expect(response).toBe('mock-response');
      expect(axiosInstance.request).toHaveBeenCalledTimes(1);
      expect(axiosInstance.request).toHaveBeenCalledWith({
        url: '/my-endpoint',
        method: 'get',
      });
    });

    it('re-throws a non-AxiosError', async () => {
      const request = createRequestFunction(axiosInstance);

      requestSpy.mockImplementation(async () => {
        const err = new Error('Bad thing');

        throw err;
      });

      await expect(async () =>
        request({
          endpoint: '/my-endpoint',
          method: 'get',
          secure: false,
        }),
      ).rejects.toThrow('Bad thing');
    });

    it('appends the authorization header if one returned from getAuthorizationHeader', async () => {
      const getAccessToken = () => null;
      const refreshAccessToken = () => null;
      const request = createRequestFunction(
        axiosInstance,
        undefined,
        getAccessToken,
        refreshAccessToken,
      );

      (getAuthorizationHeader as jest.Mock).mockReturnValue('Bearer 123');

      await request({
        endpoint: '/my-endpoint',
        method: 'put',
        secure: true,
      });

      expect(getAuthorizationHeader).toHaveBeenCalledTimes(1);
      expect(getAuthorizationHeader).toHaveBeenCalledWith(
        '/my-endpoint',
        true,
        getAccessToken,
        refreshAccessToken,
      );

      expect(requestSpy.mock.calls[0][0].headers).toEqual({
        Authorization: 'Bearer 123',
      });
    });

    it('does not append the authorization header if one not returned from getAuthorizationHeader', async () => {
      const getAccessToken = () => null;
      const refreshAccessToken = () => null;
      const request = createRequestFunction(
        axiosInstance,
        undefined,
        getAccessToken,
        refreshAccessToken,
      );

      (getAuthorizationHeader as jest.Mock).mockReturnValue(null);

      await request({
        endpoint: '/my-endpoint',
        method: 'put',
        secure: false,
      });

      expect(getAuthorizationHeader).toHaveBeenCalledTimes(1);
      expect(getAuthorizationHeader).toHaveBeenCalledWith(
        '/my-endpoint',
        false,
        getAccessToken,
        refreshAccessToken,
      );

      expect(requestSpy.mock.calls[0][0].headers).toBeUndefined();
    });
  });
});
