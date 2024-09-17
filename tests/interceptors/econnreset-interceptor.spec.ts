import axios, { AxiosError, AxiosResponse } from 'axios';
import { createEconnresetInterceptor } from '../../src/interceptors';

jest.mock('axios');

describe('createEconnresetInterceptor', () => {
  describe('error', () => {
    it('rejects on fetch error', async () => {
      const interceptor = createEconnresetInterceptor();
      const error = {
        request: {},
        config: { url: 'http://example.org' },
      } as AxiosError;

      await expect(interceptor.error(error)).rejects.toEqual(error);
    });

    it('rejects if not an ECONNRESET error', async () => {
      const interceptor = createEconnresetInterceptor();
      const error = {
        code: 'not-ECONNRESET',
        request: { reusedSocket: true },
        config: { url: 'http://example.org' },
      } as AxiosError;

      await expect(interceptor.error(error)).rejects.toEqual(error);
    });

    it('rejects if not a reused socket', async () => {
      const interceptor = createEconnresetInterceptor();
      const error = {
        code: 'ECONNRESET',
        request: { reusedSocket: false },
        config: { url: 'http://example.org' },
      } as AxiosError;

      await expect(interceptor.error(error)).rejects.toEqual(error);
    });

    it('rejects if already retried', async () => {
      const interceptor = createEconnresetInterceptor();
      const error = {
        code: 'ECONNRESET',
        request: { reusedSocket: true },
        config: {
          url: 'http://example.org',
          _econnresetRetry: true,
        },
      } as AxiosError;

      await expect(interceptor.error(error)).rejects.toEqual(error);
    });

    it('retrys the call', async () => {
      const interceptor = createEconnresetInterceptor();
      const error = {
        code: 'ECONNRESET',
        request: { reusedSocket: true },
        config: { url: 'http://example.org' },
      } as AxiosError;

      const finalResponse = { foo: 'bar' };

      (axios as unknown as jest.Mock).mockReturnValue(finalResponse);

      const result = await interceptor.error(error);

      expect(result).toEqual(finalResponse);
      expect(axios).toHaveBeenCalledWith({
        _econnresetRetry: true,
        url: error.config?.url,
      });
    });
  });

  describe('success', () => {
    it('returns the response on success', () => {
      const interceptor = createEconnresetInterceptor();
      const res = { url: 'http://example.org' } as unknown as AxiosResponse;
      const result = interceptor.success(res);

      expect(result).toEqual(res);
    });
  });
});
