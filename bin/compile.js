const ts = require('typescript');

const compile = (fileNames, options) => {
  const program = ts.createProgram(fileNames, options);
  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start,
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n',
      );
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${
          character + 1
        }): ${message}`,
      );
    } else {
      console.log(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      );
    }
  });

  const exitCode = emitResult.emitSkipped ? 1 : 0;

  if (emitResult.emitSkipped) {
    console.error(`Failed to generate TypeScript files`);

    process.exit(exitCode);
  }
};

module.exports.compileTs = (files, module, outDir) => {
  compile(files, {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES5,
    module,
    outDir,
    declaration: true,
    strict: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    declarationMap: true,
    resolveJsonModule: true,
  });
};
