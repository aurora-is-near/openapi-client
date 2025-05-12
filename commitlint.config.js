module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(commit) => commit.startsWith('chore(release):')],
  rules: {
    'footer-max-line-length': [0],
    'body-max-line-length': [0],
  },
};
