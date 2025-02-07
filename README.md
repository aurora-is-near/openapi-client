# OpenAPI client

A type-safe [OpenAPI](https://swagger.io/specification/) client generator.

**Table of Contents**

- [Installation](#installation)
- [Generating the client](#generating-the-client)
- [Usage](#usage)
- [Typescript](#typescript)
- [Authorization](#authorization)
- [Error handling](#error-handling)
- [Debugging](#debugging)
- [Mocking](#mocking)

## Installation

```sh
yarn add @aurora-is-near/openapi-client
```

## Generating the client

This repository exposes a command line tool that you can run to generate the
OpenAPI client. After installing the package you can generate the client from
an OpenAPI specification with the following command:

```text
yarn oac http://example.api.com/docs.json
```

Alternatively, you can use a JSON file:

```text
yarn oac -f spec.json
```

Where `spec.json` is the location of the OpenAPI specification file from which
you want to generate the client.

### Custom output directory

The process described above will output the generated client files to
`node_modules/.oac`.

Alternatively, you can specify a custom output directory using the `--out`
argument, for example:

```text
yarn oac http://example.api.com/docs.json --out src/client
```

If using this pattern then for the remainder of these docs where we refer to
importing from `@immediate_media/openapi-client` you should instead import
from the index file of your custom output folder, for example:

```js
import { createMyApiClient } from './generated';
```

## Usage

Once the API client has been generated it can be instantiated as follows:

```js
import { createMyApiClient } from '@aurora-is-near/openapi-client';

const client = createMyApiClient({
  baseURL: 'http://example.api.com',
  getAccessToken: () => 'my-access-token',
  refreshAccessToken: () => 'my-new-access-token',
  onError: console.error,
});
```

Where `createMyApiClient` is generated based on the title in the OpenAPI spec.
For example, if the title is "Mobile BFF" then this function will be
`createMobileBffClient`.

The client object exposes functions for each API operation, as defined by the
OpenAPI specification. Each function is called with an object containing the
following properties:

### `params`

An object containing properties that are mapped to any named route parameters.
For example, if you have the route `/user/:name`, then the `name` property should
be passed in as `params: { name: 'Alex' }`.

### `query`

An object containing a property for each query string parameter.

### `data`

An object containing key-value to submit as the request body
(i.e. for POST or PUT requests).

---

For example, given the following (simplified) OpenAPI specification:

```json
{
  "openapi": "3.0.1",
  "info": {
    "title": "My API"
  },
  "paths": {
    "/example/{id}/get-stuff": {
      "get": {
        "operationId": "myExampleOperation",
        "parameters": [
          {
            "name": "id",
            "in": "path"
          },
          {
            "name": "limit",
            "in": "query"
          }
        ]
      }
    }
  }
}
```

When we run this code:

```js
import { createMyApiClient } from '@aurora-is-near/openapi-client';

const client = createMyApiClient({
  baseURL: 'http://example.api.com',
});

client.myExampleOperation({
  params: { id: 123 },
  query: { limit: 1 },
});
```

A request like this would be made:

```text
GET /example/123/get-stuff?limit=1
```

### Query parameter serialization

Arrays are serialized in the brackets format, for example:

```js
import { createMyApiClient } from '@aurora-is-near/openapi-client';

const client = createMyApiClient({
  baseURL: 'http://example.api.com',
});

client.search({
  params: { id: 123 },
  query: {
    text: 'hello',
    filter: ['world'],
    sort: {
      asc: 'foo',
    }
  },
});
```

Becomes:

```text
GET /example/123/get-stuff?text=hello&filter[]=world&sort[asc]=foo
```

A custom serializer can be passed in via the `paramsSerializer` property, for
example:

```js
import qs from 'qs';
import { createMyApiClient } from '@aurora-is-near/openapi-client';

const client = createMyApiClient({
  baseURL: 'http://example.api.com',
  paramsSerializer: (params) => {
    return qs.stringify(params, {
      encodeValuesOnly: true,
      arrayFormat: 'brackets',
    });
  },
});
```

## Typescript

Two types are generated for each API operation. One for the options
(`params`, `query` and `data`) and one for the response, for example:

```js
import { createMyApiClient, MyApiMethods } from '@aurora-is-near/openapi-client';

const client = createMyApiClient({
  baseURL: 'http://example.api.com',
});

export const getMyExample = (
  options: MyApiMethods['myExampleOperation']['options']
): MyApiMethods['myExampleOperation']['response'] => (
  client.myExampleOperation(options)
);
```

Types are also generated for each [OpenAPI component](https://swagger.io/docs/specification/components/)
present in your specification. These can be imported from
`MyApiModels`.

`MyApi` is generated based on the [title](https://swagger.io/specification/#info-object)
of the API as defined in the OpenAPI specification, transformed to pascal case.

For example, given the following specification:

```json
{
  "openapi": "3.0.1",
  "info": {
    "title": "Mobile BFF"
  },
  "components": {
    "schemas": {
      "Post": {
        "properties": {
          "title": {
            "type": "string"
          }
        },
        "type": "object",
        "required": ["title"]
      }
    }
  }
}
```

the `Post` model can be referenced as follows:

```ts
import { MobileBff } from '@aurora-is-near/openapi-client';

const post: MobileBffModels['Post'] = {
  title: 'My Post',
};
```

## Authorization

The API client supports JWT token-based authentication. Any access token
provided via the `getAccessToken()` function will be automatically attached to
requests that require it. That is, those marked where the operation in the
OpenAPI specs has a `security` property.

If a request fails an attempt is made to refresh the token by calling the
`refreshAccessToken()` function and the request is retried. If the retry fails a
401 error will be thrown, at which point the consuming application can handle
this error as appropriate (e.g. redirect the user to sign in again). If the
access token has expired an attempt will be made to refresh the token
before making the initial request, thus saving on unnecessary API calls.

You can optionally modify the `refreshStatusCodes` to be respected. For example,
you may want to log an error and attempt a refresh when a 403 is returned, as
well as a 401:

```js
import { createMyApiClient } from '@aurora-is-near/openapi-client';

const client = createMyApiClient({
  baseURL: 'http://example.api.com',
  refreshStatusCodes: [401, 403],
});
```

## Error handling

### HTTP errors

Any HTTP errors encountered when using the client will be thrown as error object
that includes the following properties:

| Property     | Description                                                            |
|--------------|------------------------------------------------------------------------|
| `statusCode` | The HTTP status code.                                                  |
| `name`       | The name of the error (e.g. `BadRequest`).                             |
| `message`    | An error message.                                                      |
| `errors`     | An array containing any validation errors (see below).                 |
| `type`       | A key that can be set via the API to uniquely identify the type of error (e.g. `/probs/the-thing-expired`). |

If the request resulted in validation errors, such as a query parameter being
in the wrong format, then `errors` will include one or more objects with the
following properties:

| Property     | Description                                             |
|--------------|---------------------------------------------------------|
| `property`   | The name of the property that failed validation.        |
| `constraint` | The name of the constraint that failed.                 |
| `message`    | A message explaining why the constraint failed.         |

The `isOpenApiClientError()` function may be used to determine if an error is
an expected OpenAPI client error (i.e. an HTTP error), for example:

```js
import { createMyApiClient, isOpenApiClientError }
from '@aurora-is-near/openapi-client';

const client = createMyApiClient({
  baseURL: 'http://example.api.com',
});

try {
  await client.myExampleOperation();
} catch(err) {
  if (!isOpenApiClientError(err)) {
    throw err;
  }

  if (err.type === '/probs/the-thing-expired') {
    // Handle this specific case

    return;
  }

  console.error(`HTTP Error: ${err.statusCode}`);
}
```

Errors will be logged to the console. To implement custom error handling you
can pass `onError()` and `onClientError()` callbacks when setting up the client,
to handle server errors (5xx) and client errors (4xx), respectively. By default
server errors will be logged via `console.error` and client errors via
`console.warn`.

### Timeout errors

Any timeout errors encountered when using the client will be thrown as an error object
that includes the following properties:

| Property     | Description                                                      |
|--------------|------------------------------------------------------------------|
| `code`       | The timeout code  see: <https://www.npmjs.com/package/axios#error-types>.                                                               |
| `name`       | The name of the error - OpenApiClientTimeoutError.               |
| `message`    | An error message.                                                |

The `isOpenApiClientTimeoutError()` function may be used to determine if an error is
an expected OpenAPI timeout error, for example:

```js
import { createMyApiClient, isOpenApiClientTimeoutError }
from '@aurora-is-near/openapi-client';

const client = createMyApiClient({
  baseURL: 'http://example.api.com',
});

try {
  await client.myExampleOperation();
} catch(err) {
  if (!isOpenApiClientTimeoutError(err)) {
    throw err;
  }

  console.error(`Request timed out: ${err.code}`);
}
```

By default errors will be logged to the console as a warning via `console.warn`.
To implement custom error handling you can pass an `onTimeoutError()` callback
when setting up the client.

## Accept header

The API client will send an `Accept` header with every request in the format:

```text
application/vnd.[NAME]+json; version=[VERSION]
```

Where `NAME` is generated based on the [title](https://swagger.io/specification/#info-object)
defined in the OpenAPI specification, transformed to lower case, and `VERSION` is
the version from the package.json of your repository.

This header is here in case the API wants to respond differently, or perhaps
log some error based on the version recieved.

## Debugging

To log all outgoing requests you can pass in an `onRequest()` function, which is
called with details about every request. For example:

```js
import { createMyApiClient } from '@aurora-is-near/openapi-client';

const client = createMyApiClient({
  baseURL: 'http://example.api.com',
  onRequest: ({ method, url }) => {
    console.debug(`${method.toUpperCase()} ${url.href}`);
  },
});
```

## Request timeout

To prevent requests remaining unresolved for a long period, a default timeout of
15000ms is set on all requests.

This may be overridden using the `timeout` argument on open api
client creation.

```js
import { createMyApiClient } from '@aurora-is-near/openapi-client';

const client = createMyApiClient({
  baseURL: 'http://example.api.com',
  timeout: 5000,
});
```

The timeout can be specified as a number or an object of type `Timeout` which is
an object that has optional keys for the method name with the value a number. The
corresponding value will be attached to the method request via an interceptor.

## Mocking

You can create a type-safe mock API client by installing the `jest-mock-extended`
package:

```text
yarn add jest-mock-extended -D
```

Creating a file containing something like the following, where the `MyApi`
in `createMyApiClient` and `MyApiClient` is swapped
out for the title in the OpenAPI spec, converted to pascal case
(e.g. `createMobileBffClient` and `MobileBffClient`):

```js
// jest.mockApiClient.ts
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import {
  getMyApiOperations,
  createMyApiClient,
  MyApiClient,
} from '@aurora-is-near/openapi-client';

const noop = {} as MyApiClient;
const operations = getMyApiOperations(noop);

jest.mock('@aurora-is-near/openapi-client', () => ({
  ...jest.requireActual('@aurora-is-near/openapi-client'),
  createMyApiClient: jest.fn(),
}));

const mockClient = mockDeep<OpenApiClient>() as DeepMockProxy<OpenApiClient> & {
  [x: string]: jest.Mock;
};

(createMyApiClient as jest.Mock).mockReturnValue(mockClient);

Object.keys(operations).forEach((key) => {
  mockClient[key].mockImplementation(() => {
    console.warn(
      `No mock return value set for API client operation ${key}. ` +
        'Try adding a mock resolved value, for example: ' +
        `\`apiClient.${key}.mockResolvedValue({ foo: 'bar' })\``,
    );
  });
});
```

Adding the following to your Jest
[`setupFilesAfterEnv`](https://jestjs.io/docs/configuration#setupfilesafterenv-array)
array:

```js
module.exports = {
  setupFilesAfterEnv: [
    './node_modules/@aurora-is-near/openapi-client/mock.ts',
  ],
};
```

Then in your tests you can then create a mock client by calling the
`createMyApiClient()` function. All operations will have been replaced with
Jest mocks, meaning you can mock API responses like so:

```ts
const client = createMyApiClient({ baseURL: 'http://example.api.com' });

client.myOperation.mockResolvedValue({ foo: 'bar' });
```
