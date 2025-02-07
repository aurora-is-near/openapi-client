#!/usr/bin/env node
const appRoot = require('app-root-path');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { build } = require('./build');

const { argv } = yargs(hideBin(process.argv));

const DEFAULT_BUILD_DIR = path.join(appRoot.path, 'node_modules', '.oac');

const outPath = argv.out || DEFAULT_BUILD_DIR;
const fullOutPath = path.isAbsolute(outPath)
  ? outPath
  : path.join(process.cwd(), outPath);

(async () => {
  try {
    await build(fullOutPath);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
})();
