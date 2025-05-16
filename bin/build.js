/* eslint-disable no-console */
const { ModuleKind } = require('typescript');
const {
  getTypeScriptReader,
  getJsonSchemaWriter,
  makeConverter,
} = require('typeconv');
const path = require('path');
const assert = require('assert');
const glob = require('fast-glob');
const { pascalCase } = require('pascal-case');
const openapiTS = require('openapi-typescript');
const appRoot = require('app-root-path');
const chalk = require('chalk');
const { camelCase } = require('change-case');
const fse = require('fs-extra');
const { compileTemplate } = require('./compile-template');
const { writeFile } = require('./write-file');
const { SRC_DIR, TEMPLATES_DIR } = require('./constants');
const { compileTs } = require('./compile');
const { getOapiSpecs } = require('./get-spec');

// eslint-disable-next-line import/no-dynamic-require
const pkg = require(`${appRoot.path}/package.json`);

/**
 * Format a JSON Schema title as a TypeScript refererence.
 *
 * The JSON schema titles look something like:
 * operations."SearchController.post".responses.200.content."application/json"
 *
 * The type ref in the generated file looks like:
 * operations['"SearchController.post"']['responses']['200']['content']['"application/json"']
 */
const formatJsonSchemaTitleAsType = (jsonSchemaTitle) => {
  const parts = jsonSchemaTitle.split('.');
  const fixedParts = [];

  // Rejoin any parts like "SearchController.post"
  parts.forEach((part, index) => {
    if (part.endsWith('"') && !part.startsWith('"')) {
      fixedParts[index - 1] = `${fixedParts[index - 1]}.${part}`;

      return;
    }

    fixedParts.push(part);
  });

  return fixedParts
    .map((part) => part.replace(/^"/, '').replace(/"$/, ''))
    .map((part, index) => (index ? `['${part}']` : part))
    .join('');
};

/**
 * Build up a reference to one of our types from a content schema.
 */
const getTypeReferenceFromJson = (content) => {
  if (!content || !content.properties) {
    return 'undefined';
  }

  const jsonKey = '"application/json"';

  if (!(jsonKey in content.properties)) {
    throw new Error('No "application/json: content found');
  }

  const { title } = content.properties[jsonKey] || {};

  if (!title) {
    throw new Error('No component reference found');
  }

  const typeRef = formatJsonSchemaTitleAsType(title);
  const requestBodySuffix = "['content']['application/json']";

  // The OpenAPI TypeScript generator says that the request body is optional,
  // which is technically true, depending on the operation. But we already cover
  // that in a different way (by marking the entire `data` option for our client
  // as undefined). If we define a type for the request body then it is not
  // optional.
  if (typeRef.includes(requestBodySuffix)) {
    return `NonNullable<${typeRef.replace(
      requestBodySuffix,
      '',
    )}>${requestBodySuffix}`;
  }

  return typeRef;
};

/**
 * Build up a reference to one of our types for the function response.
 */
const getFunctionResponseType = (operationId, operationSchema) => {
  const { responses } = operationSchema.properties || {};

  if (!responses) {
    throw new Error(
      `No responses were defined for operation ID "${operationId}".`,
    );
  }

  const successStatusCodes = Object.keys(responses.properties).filter(
    (statusCode) => statusCode.startsWith('2'),
  );

  if (!successStatusCodes.length) {
    throw new Error(
      `No success responses were defined for operation ID "${operationId}".`,
    );
  }

  if (successStatusCodes.length > 1) {
    throw new Error(
      `Multiple success responses were defined for operation ID "${operationId}".`,
    );
  }

  const [successStatusCode] = successStatusCodes;
  const { content } = responses.properties[successStatusCode].properties || {};

  try {
    return getTypeReferenceFromJson(content);
  } catch (err) {
    throw new Error(
      `Invalid success responses schema was defined for operation ID "${operationId}": ${err.message}.`,
    );
  }
};

/**
 * Build up a reference to one of our types for the request body, if any.
 */
const getDataType = (operationId, operationSchema) => {
  const { requestBody } = operationSchema.properties || {};

  if (!requestBody) {
    return null;
  }

  try {
    return getTypeReferenceFromJson(requestBody.properties.content);
  } catch (err) {
    throw new Error(
      `Invalid request body schema was defined for operation ID "${operationId}": ${err.message}.`,
    );
  }
};

/**
 * Build up a reference to one of our types for the parameters, if any.
 */
const getParametersType = (operationId, operationSchema, subType) => {
  const { parameters } = operationSchema.properties || {};

  if (!((parameters || {}).properties || {})[subType]) {
    return null;
  }

  return `operations['${operationId}']['parameters']['${subType}']`;
};

/**
 * Build up a reference to one of our types for the parameters, if any.
 */
const hasRequiredParametersType = (operationSchema, subType) => {
  const { parameters } = operationSchema.properties || {};

  if (!((parameters || {}).properties || {})[subType]) {
    return false;
  }

  return (parameters.properties[subType].required || []).length > 0;
};

const isFormDataOperation = (operationSchema) => {
  const { requestBody } = operationSchema.properties || {};

  if (!requestBody) {
    return false;
  }

  const { content } = requestBody.properties || {};

  return '"multipart/form-data"' in content.properties;
};

/**
 * Get the core details about the API's operations.
 */
const getFlatOperations = ({ paths }, jsonSchemaTypes) =>
  Object.entries(paths).reduce(
    (acc, [endpoint, endpointConfig]) => [
      ...acc,
      ...Object.entries(endpointConfig)
        .map(([method, methodConfig]) => {
          const { operationId } = methodConfig;
          const operationSchema =
            jsonSchemaTypes.definitions.operations.properties[operationId];

          if (isFormDataOperation(operationSchema)) {
            console.warn(
              `Skipping operation "${operationId}": form data operations are not supported yet`,
            );

            return null;
          }

          const dataTypeRef = getDataType(operationId, operationSchema);
          const pathParametersTypeRef = getParametersType(
            operationId,
            operationSchema,
            'path',
          );

          const queryParametersTypeRef = getParametersType(
            operationId,
            operationSchema,
            'query',
          );

          const hasRequiredQueryParameters = hasRequiredParametersType(
            operationSchema,
            'query',
          );

          const hasOptionalOptions =
            !hasRequiredQueryParameters &&
            !pathParametersTypeRef &&
            !dataTypeRef;

          return {
            endpoint,
            method,
            operationId,
            secure: !!(methodConfig.security || []).length,
            hasOptions:
              pathParametersTypeRef || queryParametersTypeRef || dataTypeRef,
            hasOptionalOptions,
            responseTypeRef: getFunctionResponseType(
              operationId,
              operationSchema,
            ),
            dataTypeRef,
            pathParametersTypeRef,
            queryParametersTypeRef,
            hasRequiredQueryParameters,
            summary: methodConfig.summary,
            description: methodConfig.description,
            tags: methodConfig.tags,
            parameters: methodConfig.parameters,
          };
        })
        .filter(Boolean),
    ],
    [],
  );

/**
 * Build a file that defines the API client functions.
 */
const buildClientFile = async (outDir, oapiSpec, operations) => {
  const fileName = 'client.ts';
  const templatePath = path.join(TEMPLATES_DIR, `${fileName}.tmpl`);
  const outPath = path.join(outDir, fileName);

  await compileTemplate(templatePath, outPath, {
    name: pascalCase(oapiSpec.info.title),
    operations,
  });
};

/**
 * Build the types file, generated from the OpenAPI spec.
 */
const buildTypesFile = async (outDir, types) => {
  const outPath = path.join(outDir, 'types.ts');
  const content = `/* eslint-disable */\n${types}`;

  writeFile(outPath, content);
};

/**
 * Build the index file that pull together the files generated for each client.
 */
const buildIndexFile = async (oapiSpecs, generatedFilesDir) => {
  const fileName = 'index.ts';
  const templatePath = path.join(TEMPLATES_DIR, `${fileName}.tmpl`);
  const outPath = path.join(generatedFilesDir, fileName);

  await compileTemplate(templatePath, outPath, {
    services: oapiSpecs.map((spec) => ({
      dir: camelCase(spec.info.title),
      name: pascalCase(spec.info.title),
      title: spec.info.title,
      version: pkg.version,
    })),
  });
};

/**
 * Convert the TS to a JSON schema.
 *
 * So we can parse it and discover what's in the code! For example, does a
 * particular operation have any parameters.
 */
const convertTsToJsonSchema = async (ts) => {
  const reader = getTypeScriptReader();
  const writer = getJsonSchemaWriter();
  const { convert } = makeConverter(reader, writer);
  const { data } = await convert({ data: ts });

  return JSON.parse(data);
};

/**
 * Check the API specification is valid
 */
const validateOapiSpec = (oapiSpec, operations) => {
  const { swagger, openapi } = oapiSpec;
  const version = swagger || openapi;
  const versionKey = swagger ? 'swagger' : 'openapi';

  assert.ok(
    version,
    'Expected either the `swagger` or `openapi` properties to exist.',
  );

  assert.ok(
    /^[2-3]\./.test(version),
    `Expected \`${versionKey}\` to be >= 2 and < 4, got "${version}".`,
  );

  const endpointsWithMissingOperationIds = operations
    .filter(({ operationId }) => !operationId)
    .map(({ endpoint }) => endpoint);

  assert.ok(
    !endpointsWithMissingOperationIds.length,
    `Expected all endpoints to have operation IDs: ${endpointsWithMissingOperationIds}.`,
  );

  const operationIds = operations.map(({ operationId }) => operationId);
  const duplicateOperationIds = operationIds.filter(
    (item, index) => operationIds.indexOf(item) !== index,
  );

  assert.ok(
    !duplicateOperationIds.length,
    `Expected operation IDs to be unique but found duplicates: ${duplicateOperationIds}.`,
  );
};

/**
 * Build an API client based on its OpenAPI spec.
 */
const buildClient = async (oapiSpec, buildDir, generatedFilesDir) => {
  const { title } = (oapiSpec || {}).info || {};
  const outDir = path.join(generatedFilesDir, camelCase(title));
  const types = await openapiTS(oapiSpec);
  const jsonSchemaTypes = await convertTsToJsonSchema(types);
  const operations = getFlatOperations(oapiSpec, jsonSchemaTypes);

  console.info(chalk.gray(`Validating ${title} specification`));
  validateOapiSpec(oapiSpec, operations);

  console.info(chalk.gray(`Generating ${title} client`));
  await Promise.all([
    buildClientFile(outDir, oapiSpec, operations),
    buildTypesFile(outDir, types),
  ]);

  const files = glob.sync('**.ts', { cwd: SRC_DIR, absolute: true });

  compileTs(files, ModuleKind.CommonJS, buildDir);

  console.info(`${chalk.green('✔')} ${oapiSpec.info.title} client generated`);
};

/**
 * Generate all the things.
 */
module.exports.build = async (buildDir) => {
  const oapiSpecs = await getOapiSpecs();
  const generatedClientsDir = path.join(buildDir, 'generated');

  fse.emptyDirSync(generatedClientsDir);
  fse.emptyDirSync(buildDir);

  await Promise.all([
    ...oapiSpecs.map((openapiSpec) =>
      buildClient(openapiSpec, buildDir, generatedClientsDir),
    ),
    buildIndexFile(oapiSpecs, generatedClientsDir),
  ]);
};
