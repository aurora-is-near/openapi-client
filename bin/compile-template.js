const path = require('path');
const fse = require('fs-extra');
const Handlebars = require('handlebars');

// Custom helpers.
Handlebars.registerHelper('toLowerCase', (str) =>
  str ? str.toLowerCase() : '',
);

Handlebars.registerHelper('anchor', (str) => {
  if (!str) {
    return '';
  }

  return `#${str.toLowerCase().replace(/\s/g, '-')}`;
});

Handlebars.registerHelper('toUpperCase', (str) =>
  str ? str.toUpperCase() : '',
);

Handlebars.registerHelper('bool', (str) => !!str);
Handlebars.registerHelper('stripWhitespace', (str) =>
  str ? str.replace(/\r?\n|\r|\s+/g, ' ') : '',
);

/**
 * Compile a Handlebars template.
 */
module.exports.compileTemplate = async (
  templateFilePath,
  outPath,
  templateData,
) => {
  const source = fse.readFileSync(templateFilePath).toString();
  const template = Handlebars.compile(source);
  const compiledContent = template(templateData);

  fse.ensureDirSync(path.dirname(outPath));

  return fse.writeFile(outPath, Buffer.from(compiledContent));
};
