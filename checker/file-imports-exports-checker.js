const { traverseAST, buildAST, getDefaultFileObject } = require("../ast/index");
const { updateFilesMetadata } = require("../utility/files");
const checkFileImportsExports = (
  entyFileLocation,
  filesMetadata,
  traverseType
) => {
  if (!filesMetadata.filesMapping[entyFileLocation]) {
    filesMetadata.filesMapping[entyFileLocation] =
      getDefaultFileObject(entyFileLocation);
  }
  filesMetadata.filesMapping[entyFileLocation].isEntryFile = true;
  if (
    isFileNotVisited(entyFileLocation, filesMetadata) &&
    isFileExtensionValid(entyFileLocation)
  ) {
    traverseFile(entyFileLocation, filesMetadata, traverseType);
  }
};

const traverseFile = (fileLocation, filesMetadata, traverseType) => {
  filesMetadata.visitedFilesMapping[fileLocation] = true;
  try {
    let ast = buildAST(fileLocation);
    let currentFileMetadata = {
      importedVariables: {},
      exportedVariables: {},
      importedFilesMapping: {},
      staticImportFilesMapping: {},
      fileLocation,
    };
    traverseAST(ast, currentFileMetadata, "CHECK_IMPORTS");
    updateFilesMetadata(filesMetadata, currentFileMetadata);
    let requiredImportedFilesMapping =
      traverseType === "DEADFILE_FINDER_TRAVERSE"
        ? currentFileMetadata.importedFilesMapping
        : currentFileMetadata.staticImportFilesMapping;
    for (const file in requiredImportedFilesMapping) {
      if (
        isFileNotVisited(file, filesMetadata) &&
        isFileExtensionValid(file) &&
        isFileNotExcluded(file, filesMetadata.excludedPointsRegex)
      ) {
        if (!filesMetadata.filesMapping[file]) {
          filesMetadata.filesMapping[file] = getDefaultFileObject(file);
        }
        traverseFile(file, filesMetadata, traverseType);
      } else if (
        isFileMappingNotPresent(file, filesMetadata)
      ) {
        filesMetadata.filesMapping[file] = getDefaultFileObject(file);
      }
    }
    traverseAST(ast, currentFileMetadata, "CHECK_EXPORTS", filesMetadata);
    updateFilesMetadata(filesMetadata, currentFileMetadata);
    ast = null;
    currentFileMetadata = null;
    requiredImportedFilesMapping = null;
  } catch (err) {
    filesMetadata.unparsableVistedFiles++;
    console.error("Unable to parse file:", fileLocation);
    console.error(err);
  }
};

module.exports = { checkFileImportsExports };
const isFileNotVisited = (fileLocation, filesMetadata) =>
  !filesMetadata.visitedFilesMapping[fileLocation];
const isFileExtensionValid = (fileLocation) =>
  /\.(js|jsx|ts|tsx)$/.test(fileLocation);
const isFileNotExcluded = (file, excludedPointsRegex) =>
  !excludedPointsRegex.test(file);
const isFileMappingNotPresent = (file, filesMetadata) =>
  !filesMetadata.filesMapping[file];