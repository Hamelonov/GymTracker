// Expo config plugin for the Android build: keeps CMake object-file paths under
// the Windows MAX_PATH limit (260 chars). Without it the native build fails on
// Windows with "Filename longer than 260 characters" (app) or
// "mkdir(...): No such file or directory" (libraries).
const { withAppBuildGradle, withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// gymtracker: build tweaks';
const CMAKE_ARGUMENT = '-DCMAKE_OBJECT_PATH_MAX=255';

const APP_BLOCK = `
    ${MARKER}
    externalNativeBuild {
      cmake {
        arguments "${CMAKE_ARGUMENT}"
      }
    }
`;

const ROOT_BLOCK = `
${MARKER}
subprojects { subproject ->
  subproject.plugins.withId('com.android.library') {
    subproject.android.defaultConfig.externalNativeBuild.cmake.arguments.add("${CMAKE_ARGUMENT}")
  }
}
`;

function withApp(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    const buildGradleSource = config.modResults.contents;
    if (buildGradleSource.includes(MARKER)) return config;
    config.modResults.contents = buildGradleSource.replace(
      /defaultConfig \{\n/,
      (match) => match + APP_BLOCK,
    );
    return config;
  });
}

function withRoot(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    const buildGradleSource = config.modResults.contents;
    if (buildGradleSource.includes(MARKER)) return config;
    config.modResults.contents = buildGradleSource + ROOT_BLOCK;
    return config;
  });
}

module.exports = function withShortObjectPaths(config) {
  return withRoot(withApp(config));
};
