const { TsJestTransformer } = require('ts-jest');

const IMPORT_META_URL = /\bimport\.meta\.url\b/g;
const COMMONJS_FILE_URL = "require('url').pathToFileURL(__filename).href";
const NODE_MODULES = /[\\/]node_modules[\\/]/;

function rewriteImportMeta(source, filePath) {
  if (!NODE_MODULES.test(filePath) || !source.includes('import.meta')) {
    return source;
  }
  return source.replace(IMPORT_META_URL, COMMONJS_FILE_URL);
}

class NestEsmTransformer extends TsJestTransformer {
  process(source, filePath, options) {
    return super.process(rewriteImportMeta(source, filePath), filePath, options);
  }

  processAsync(source, filePath, options) {
    return super.processAsync(
      rewriteImportMeta(source, filePath),
      filePath,
      options,
    );
  }
}

module.exports = {
  createTransformer: (options) => new NestEsmTransformer(options),
};
