const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

module.exports.SRC_DIR = path.join(ROOT_DIR, 'src');
module.exports.DIST_DIR = path.join(ROOT_DIR, 'dist');
module.exports.TEMPLATES_DIR = path.join(__dirname, 'templates');
