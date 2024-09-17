import qs from 'qs';

export const serializeQueryParams = (params: unknown) =>
  qs.stringify(params, {
    encodeValuesOnly: true,
    arrayFormat: 'brackets',
  });
