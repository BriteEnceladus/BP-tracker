const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Force CMake to hash long object-file names so Windows ninja does not
 * fail with "Filename longer than 260 characters" during New Architecture codegen.
 */
function withCmakeObjectPath(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes('CMAKE_OBJECT_PATH_MAX')) {
      return mod;
    }
    mod.modResults.contents = mod.modResults.contents.replace(
      /buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL".*\n/,
      (match) =>
        `${match}        externalNativeBuild {\n` +
        `            cmake {\n` +
        `                arguments "-DCMAKE_OBJECT_PATH_MAX=180"\n` +
        `            }\n` +
        `        }\n`
    );
    return mod;
  });
}

module.exports = withCmakeObjectPath;
