export type ValidationError = {
  property: string;
  constraint: string;
  message: string;
};

type OpenApiClientErrorOptions = {
  type?: string;
  errors?: ValidationError[];
};

export type OpenApiClientTimeoutErrorCode = 'ECONNABORTED' | 'ETIMEDOUT';

type OpenApiClientErrorCode = 'EHTTPCLIENT' | 'EHTTPSERVER';

type ErrorCodes = OpenApiClientTimeoutErrorCode | OpenApiClientErrorCode;

class BaseOpenApiClientError extends Error {
  code: ErrorCodes;

  constructor(message: string, code: ErrorCodes) {
    super(message);

    this.code = code;
  }
}

export class OpenApiClientError extends BaseOpenApiClientError {
  statusCode: number;

  type?: string;

  errors?: ValidationError[];

  isOpenApiClientError = true;

  constructor(
    statusCode: number,
    message: string,
    { errors, type }: OpenApiClientErrorOptions = {},
  ) {
    const code = statusCode >= 500 ? 'EHTTPSERVER' : 'EHTTPCLIENT';

    super(
      `${message}${
        errors?.length
          ? ` ${errors
              ?.map(
                (err) => `${err.message} (${err.property} ${err.constraint})`,
              )
              .join(', ')}`
          : ''
      }`,
      code,
    );

    this.statusCode = statusCode;
    this.name = 'OpenApiClientError';
    this.errors = errors;
    this.type = type;
  }
}

/**
 * Determines whether a value is (probably) an error thrown by the API client.
 */
export const isOpenApiClientError = (
  value: unknown,
): value is OpenApiClientError =>
  typeof value === 'object' && !!value && 'isOpenApiClientError' in value;

export class OpenApiClientTimeoutError extends BaseOpenApiClientError {
  isOpenApiClientTimeoutError = true;

  constructor(message: string, code: OpenApiClientTimeoutErrorCode) {
    super(message, code);

    this.name = 'OpenApiClientTimeoutError';
    this.code = code;
  }
}

/**
 * Determines whether a value is (probably) a timeout error thrown by the API client.
 */
export const isOpenApiClientTimeoutError = (
  value: unknown,
): value is OpenApiClientTimeoutError =>
  typeof value === 'object' &&
  !!value &&
  'isOpenApiClientTimeoutError' in value;
