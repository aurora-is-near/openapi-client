const { execSync } = require('child_process');

const currentBranch = execSync('git rev-parse --abbrev-ref HEAD')
  .toString()
  .trim();

const defaultBranch = 'main';
const isDefaultBranch = currentBranch === defaultBranch;

module.exports = {
  branches: [
    defaultBranch,
    {
      name: 'canary/*',
      // eslint-disable-next-line no-template-curly-in-string
      prerelease: '${name.replace(/^canary\\//g, "")}',
    },
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/npm',
    '@semantic-release/release-notes-generator',
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        assets: isDefaultBranch ? ['package.json'] : [],
        message:
          // eslint-disable-next-line no-template-curly-in-string
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
