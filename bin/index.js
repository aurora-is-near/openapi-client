#!/usr/bin/env node
const { build } = require('./build.js');

(async () => {
  try {
    await build();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
