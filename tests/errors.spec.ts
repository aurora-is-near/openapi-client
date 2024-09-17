import {
  isOpenApiClientError,
  OpenApiClientError,
  isOpenApiClientTimeoutError,
  OpenApiClientTimeoutError,
  OpenApiClientTimeoutErrorCode,
} from '../src/errors';

describe('Errors', () => {
  describe('OpenApiClientError', () => {
    it('creates a basic error', () => {
      const err = new OpenApiClientError(400, 'BadRequest');

      expect(err.statusCode).toBe(400);
      expect(err.type).toBeUndefined();
      expect(err.errors).toBeUndefined();
      expect(err.message).toMatchSnapshot();
    });

    it('creates an error with a type and validation errors', () => {
      const err = new OpenApiClientError(400, 'BadRequest', {
        type: '/probs/bad-request',
        errors: [
          {
            property: 'email',
            message: 'The email is no good',
            constraint: 'isValid',
          },
        ],
      });

      expect(err.statusCode).toBe(400);
      expect(err.type).toBe('/probs/bad-request');
      expect(err.errors).toEqual([
        {
          property: 'email',
          message: 'The email is no good',
          constraint: 'isValid',
        },
      ]);

      expect(err.message).toMatchSnapshot();
    });
  });

  describe('isOpenApiClientError', () => {
    it('returns true if an error is a OpenApiClientError', () => {
      const error = new OpenApiClientError(500, 'Internal Server Error');

      expect(isOpenApiClientError(error)).toBe(true);
    });

    it('returns false if an error is not a OpenApiClientError', () => {
      const error = new Error();

      expect(isOpenApiClientError(error)).toBe(false);
    });

    it('returns false if an error is not an error object', () => {
      expect(isOpenApiClientError('')).toBe(false);
    });
  });

  describe('OpenApiClientTimeoutError', () => {
    it.each(['ECONNABORTED', 'ETIMEDOUT'])(
      'creates a timeout error for status code %s',
      (code) => {
        const err = new OpenApiClientTimeoutError(
          'Request aborted',
          code as OpenApiClientTimeoutErrorCode,
        );

        expect(err.message).toBe('Request aborted');
        expect(err.code).toBe(code);
        expect(err.message).toMatchSnapshot();
      },
    );
  });

  describe('isOpenApiClientTimeoutError', () => {
    it.each(['ECONNABORTED', 'ETIMEDOUT'])(
      'returns true if an error is an OpenApiClientTimeoutError and %s',
      (code) => {
        const error = new OpenApiClientTimeoutError(
          'Request aborted',
          code as OpenApiClientTimeoutErrorCode,
        );

        expect(isOpenApiClientTimeoutError(error)).toBe(true);
      },
    );

    it('returns false if an error is not an OpenApiClientTimeoutError', () => {
      const error = new Error();

      expect(isOpenApiClientTimeoutError(error)).toBe(false);
    });

    it('returns false if an error is not an error object', () => {
      expect(isOpenApiClientTimeoutError('')).toBe(false);
    });
  });
});
