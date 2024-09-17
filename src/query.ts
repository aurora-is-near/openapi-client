import qs from 'qs';

export const serializeQueryParams = (params: any) =>
  qs.stringify(params, {
    encodeValuesOnly: true,
    arrayFormat: 'brackets',
  });
