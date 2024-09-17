import decode from 'jwt-decode';
import { OpenApiClientError } from './errors';

type DecodedToken = {
  role?: string | string[];
  exp: number;
};

export type AccessToken = string | null | undefined;

export type TokenRetrieverFunction = () => AccessToken | Promise<AccessToken>;

/**
 * Get a property from the access token.
 */
const getTokenProperty = (accessToken: string, key: keyof DecodedToken) => {
  try {
    return decode<DecodedToken>(accessToken)[key];
  } catch (err) {
    // Failed to decode token, ignore.
    return null;
  }
};

/**
 * Check if the user has the admin role.
 */
const isUserAdmin = (accessToken: string) => {
  const role = getTokenProperty(accessToken, 'role');
  const adminRole = 'wp-admin';

  if (!role) {
    return false;
  }

  return (
    role === adminRole || (Array.isArray(role) && role.includes(adminRole))
  );
};

/**
 * Check if an access token has expired.
 */
const isTokenExpired = (accessToken: string) => {
  const exp = getTokenProperty(accessToken, 'exp');
  const timeNow = new Date().getTime() / 1000;

  if (typeof exp !== 'number') {
    return true;
  }

  return exp < timeNow;
};

/**
 * Throw a 401 Unauthorized error.
 */
const throwUnauthorizedError = (message: string, url: string) => {
  throw new OpenApiClientError(401, `${message} <${url}>`);
};

function assertDefined<T>(
  errorMessage: string,
  url: string,
  value?: T | null,
): asserts value is T {
  if (!value) {
    throwUnauthorizedError(errorMessage, url);
  }
}

const getRefreshedAccessToken = async (
  url: string,
  refreshAccessToken?: TokenRetrieverFunction,
): Promise<string> => {
  assertDefined(
    'Authorization is required but there is no valid access token and no `refreshAccessToken()` function was provided',
    url,
    refreshAccessToken,
  );

  const refreshedToken = await refreshAccessToken();

  assertDefined(
    'Authorization is required but there is no valid access token and nothing was returned from `refreshAccessToken()`',
    url,
    refreshedToken,
  );

  return refreshedToken;
};

/**
 * Get the bearer authorization header.
 */
export const getAuthorizationHeader = async (
  url: string,
  secure: boolean,
  getAccessToken?: TokenRetrieverFunction,
  refreshAccessToken?: TokenRetrieverFunction,
) => {
  if (secure) {
    assertDefined(
      'Authorization is required but no `getAccessToken()` function was provided',
      url,
      getAccessToken,
    );
  }

  const noop = () => null;
  let accessToken = await (getAccessToken ?? noop)();

  if (!secure && (!accessToken || !isUserAdmin(accessToken))) {
    return null;
  }

  if (!accessToken) {
    accessToken = await getRefreshedAccessToken(url, refreshAccessToken);
  }

  // If the user is an admin and their token has expired but the route was not
  // secure anyway then we can still go ahead and make the request.
  if (!secure && isTokenExpired(accessToken)) {
    return null;
  }

  if (isTokenExpired(accessToken)) {
    accessToken = await getRefreshedAccessToken(url, refreshAccessToken);

    if (isTokenExpired(accessToken)) {
      throwUnauthorizedError(
        'Authorization is required but the access token has expired and `refreshAccessToken()` also returned an expired token',
        url,
      );
    }
  }

  return `Bearer ${accessToken}`;
};
