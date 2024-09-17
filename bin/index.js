#!/usr/bin/env node
const { build } = require('./build');

(async () => {
  try {
    await build();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
})();
