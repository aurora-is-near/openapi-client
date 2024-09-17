const path = require('path');
const fse = require('fs-extra');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');
const axios = require('axios');
const { backOff } = require('exponential-backoff');

const { argv } = yargs(hideBin(process.argv));

module.exports.getSpecFromFile = async (partialSpecPath) => {
  const specPath = path.isAbsolute(partialSpecPath)
    ? partialSpecPath
    : path.join(process.cwd(), partialSpecPath);

  if (!fse.existsSync(specPath)) {
    throw new Error(`No spec found at ${specPath}`);
  }

  const json = fse.readJSONSync(specPath);

  console.info(chalk.gray(`OpenAPI specification loaded from ${specPath}`));

  return json;
};

const fetchOapiSpec = async (url) => {
  let res;

  try {
    res = await axios.get(url);
  } catch (err) {
    throw new Error(
      `Failed to load API spec: ${
        axios.isAxiosError(err)
          ? err.response?.status ?? err.code
          : 'Unknown error'
      }`,
    );
  }

  if (!res.headers['content-type'].includes('application/json')) {
    throw new Error(
      `Response is not JSON: Content-Type=${res.headers['content-type']}`,
    );
  }

  console.info(chalk.gray(`OpenAPI specification loaded from ${url}`));

  return res.data;
};

const retry = (promise) =>
  backOff(promise, {
    numOfAttempts: 3,
    startingDelay: 2000,
    retry: (error, attemptNumber) => {
      console.error(
        new Error(`${error.message} (retry attempt ${attemptNumber})`),
      );

      return true;
    },
  });

module.exports.getOapiSpecs = async () => {
  if (argv.f) {
    return this.getSpecFromFile(argv.f);
  }

  if (!argv._.length) {
    throw new Error(
      `A URL or spec file must be provided to generate the API client`,
    );
  }

  const promises = argv._.map((url) => retry(() => fetchOapiSpec(url)));

  return Promise.all(promises);
};
